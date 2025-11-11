-- スキーマ抽出用関数：スキーマの値に置換対象文字列が存在する場合 真
CREATE OR REPLACE FUNCTION check_variation (src json, OUT result boolean)
RETURNS boolean AS $CODE$
DECLARE
  itemset record;
BEGIN
  result := FALSE;
  CASE json_typeof(src)
    WHEN 'object' THEN
      FOR itemset IN SELECT (json_each(src)).* LOOP
	    -- JESGOプロパティなど機能プロパティは検出の対象外
		IF itemset.key LIKE 'jesgo:%' 
		  OR
		  itemset.key IN (
			'$id', '$schema', '$ref',
			'type', 'title',
			'description', '$comment',
			'pattern'
		  )
		THEN
		  CONTINUE;
		END IF;
		-- 再帰で評価
		result := check_variation(itemset.value);
		EXIT WHEN result;
	  END LOOP;
	WHEN 'array' THEN
	  FOR itemset IN SELECT json_array_elements(src) AS value LOOP
		-- 再帰で評価
	    result := check_variation(itemset.value);
		EXIT WHEN result;
	  END LOOP;
	WHEN 'string' THEN
	  -- 文字列の検出対象は以下
	  -- 半角プラス（全角に変換）
	  result := (src::jsonb ->> 0) ~ '[+]';
	ELSE NULL;
  END CASE;
END;
$CODE$ LANGUAGE plpgsql;

-- jsonbのプロパティの値を変換する(データ用)
CREATE OR REPLACE FUNCTION regulate_jsonb_values_ (src jsonb, OUT outjson jsonb, OUT modified boolean)
AS $CODE$
DECLARE
  result RECORD;
  jsonrecord RECORD;
  stringvalue text;
BEGIN
  outjson := src;
  modified := FALSE;

  CASE jsonb_typeof(src)
    WHEN 'object' THEN
      FOR jsonrecord IN SELECT (jsonb_each(src)).* LOOP
	    -- JESGOプロパティは操作の対象外
		IF jsonrecord.key LIKE 'jesgo:%' OR
		  jsonrecord.key IN (
		    '$id', '$schema', '$ref',
		    'type', 'title',
			'description', '$comment',
			'pattern'
		  )
		  THEN
		  CONTINUE;
		END IF;
		-- 再帰で値を処理
		SELECT * FROM regulate_jsonb_values_(jsonrecord.value) INTO result;
		-- 値に操作が行われていたら値を置き換える
		IF result.modified THEN
  		  modified := TRUE;
		  outjson := jsonb_set(outjson, ('{"' || jsonrecord.key || '"}')::text[], result.outjson, false);
		END IF;
	  END LOOP;
	WHEN 'array' THEN
	  -- ARRAYにインデックスをつけて値を取得
	  FOR jsonrecord IN SELECT (ordinality - 1) index, value FROM jsonb_array_elements(src) WITH ORDINALITY LOOP
	    -- 再帰で値を処理
	    SELECT * FROM regulate_jsonb_values_(jsonrecord.value) INTO result;
		-- 値に操作が行われていたら値を置き換える
		IF result.modified THEN
		  modified := TRUE;
		  outjson := jsonb_set(outjson, ('{' || jsonrecord.index || '}')::text[], result.outjson, false);
		END IF;
	  END LOOP;
	WHEN 'string' THEN
      -- 文字列の評価
      stringvalue := src ->> 0;
	  -- 改行文字が入っている場合は検索の対象としない
	  -- 文字列フィールドとして検出対象は以下
	  -- 半角プラス（全角に変換）
	  IF position(E'\n' in stringvalue) = 0 AND stringvalue ~ '[+]' THEN
	    RAISE INFO 'found: %', stringvalue;
	    modified := TRUE;
		stringvalue := translate(stringvalue, '+', '＋');
		RAISE INFO 'replaced to: %', stringvalue;
		outjson := to_jsonb(stringvalue);
      END IF;
	ELSE
	  NULL;  
  END CASE;
END;
$CODE$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION regulate_jsonb_values (src jsonb) RETURNS jsonb
AS $CODE$
DECLARE
  returnvalue jsonb;
BEGIN
  SELECT outjson FROM regulate_jsonb_values_(src) INTO returnvalue;
  RETURN returnvalue;
END;
$CODE$ LANGUAGE plpgsql;

-- JSONの値を変換する(順序を維持するのでスキーマ用)
CREATE OR REPLACE FUNCTION regulate_json_values_ (src json, OUT outjson json, OUT modified boolean)
AS $CODE$
DECLARE
  result RECORD;
  jsonrecord RECORD;
  stringvalue text;
  keys text[];
  values json[];
  element json;
  index int;
  valuelength int;
BEGIN
  outjson := src;
  modified := FALSE;

  CASE json_typeof(src)
    WHEN 'object' THEN
	  keys := ARRAY[]::text[];
	  values := ARRAY[]::json[];
      FOR jsonrecord IN SELECT (json_each(src)).* LOOP
		keys := array_append(keys, jsonrecord.key);
	    -- JESGOプロパティは操作の対象外
		IF jsonrecord.key LIKE 'jesgo:%' OR
		  jsonrecord.key IN (
		    '$id', '$schema', '$ref',
		    'type', 'title',
			'description', '$comment',
			'pattern'
		  )
		  THEN
		    values := array_append(values, jsonrecord.value);
		    CONTINUE;
		END IF;

		-- 再帰で値を処理
		SELECT * FROM regulate_json_values_(jsonrecord.value) INTO result;
		-- 値に操作が行われていたら値を置き換える
		IF result.modified THEN
  		  modified := TRUE;
          values := array_append(values, result.outjson);
		ELSE
		  values := array_append(values, jsonrecord.value);
		END IF;
	  END LOOP;
	  IF modified THEN
	    valuelength := array_length(values, 1);
		stringvalue := '';
		index := 1;
		WHILE index <= valuelength LOOP
		  stringvalue := stringvalue || 
		     regexp_replace(json_build_object(keys[index], values[index])::text, '^\{(.*)\}$', '\1,');
		  index := index + 1;
		END LOOP;
		stringvalue := '{' || trim(trailing ',' from stringvalue) || '}';
		outjson := stringvalue::json;
	  END IF;
	WHEN 'array' THEN
	  -- ARRAYに値を展開
	  SELECT (array_agg(value::json)) FROM json_array_elements(src) INTO values;
      index := 0;

	  FOREACH element IN ARRAY values LOOP
	    index := index + 1;
	    -- 再帰で値を処理
	    SELECT * FROM regulate_json_values_(element) INTO result;
		-- 値に操作が行われていたら値を置き換える
		IF result.modified THEN
		  modified := TRUE;
		  values[index] := result.outjson;
		END IF;
	  END LOOP;
	  IF modified THEN
	    outjson := array_to_json(values);
	  END IF;
	WHEN 'string' THEN
      -- 文字列の評価
      stringvalue := src::jsonb ->> 0;
	  -- 文字列フィールドとして検出対象は以下
	  --  空白文字（削除）
	  -- 半角プラス（全角に変換）
	  IF stringvalue ~ '[+]' THEN
	    modified := TRUE;
		stringvalue := translate(stringvalue, '+', '＋');
		outjson := to_json(stringvalue);
      END IF;
	ELSE
	  NULL;  
  END CASE;
END;
$CODE$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION regulate_json_values (src json) RETURNS json
AS $CODE$
DECLARE
  returnvalue json;
BEGIN
  SELECT outjson FROM regulate_json_values_(src) INTO returnvalue;
  RETURN returnvalue;
END;
$CODE$ LANGUAGE plpgsql;

-- 一括修正
BEGIN TRANSACTION;
\warn *** 修正が必要なスキーマを検索 ***

SELECT schema_primary_id INTO TEMPORARY affected_schema FROM jesgo_document_schema
WHERE check_variation(document_schema);

SELECT (COUNT(*) = 0) AS check FROM affected_schema
\gset
\if :check 
\warn 修正更新の必要はありません
\else
\warn *** スキーマの更新を行います ***
UPDATE jesgo_document_schema
SET document_schema = regulate_json_values(document_schema)
WHERE schema_primary_id IN (SELECT schema_primary_id FROM affected_schema);
UPDATE jesgo_document
SET document = regulate_jsonb_values(document)
WHERE schema_primary_id IN (SELECT schema_primary_id FROM affected_schema);
\endif

DROP TABLE affected_schema;
COMMIT;

DROP FUNCTION regulate_json_values;
DROP FUNCTION regulate_json_values_;
DROP FUNCTION regulate_jsonb_values;
DROP FUNCTION regulate_jsonb_values_;
DROP FUNCTION check_variation;

\warn *** 処理を終了 ***
