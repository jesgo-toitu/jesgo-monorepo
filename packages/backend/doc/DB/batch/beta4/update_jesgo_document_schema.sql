--ルートスキーマに初回治療開始日にeventdate属性付与
UPDATE jesgo_document_schema
  SET document_schema =  (
    jsonb_set(
      document_schema::jsonb,
      '{properties, 初回治療開始日, jesgo:set}',
      '"eventdate"',
      TRUE))::json
  WHERE
    schema_id_string ~ '/.+/root'
  AND
    document_schema->'properties'->'初回治療開始日'->'jesgo:set' IS NULL;


--evaluations → evaluations
UPDATE jesgo_document_schema
  SET
    document_schema = REPLACE(document_schema #>> '{}', '/schema/evaluation/', '/schema/evaluations/')::json,
    schema_id_string = REPLACE(schema_id_string, '/schema/evaluation/', '/schema/evaluations/')
  WHERE document_schema #>> '{}' LIKE '%/schema/evaluation/%';

-- update /schema/OV/staging v1.x 所属リンパ節→領域リンパ節 cMの修正
UPDATE jesgo_document_schema 
SET 
document_schema = 
REPLACE(
  REPLACE(
    REPLACE(document_schema::text,'"所属リンパ節"', '"領域リンパ節"')::text,
    '"1: 胸水中に悪性細胞を認めるもの(胸水細胞診による)、実質転移ならびに腹腔外臓器(鼠径リンパ節や腹腔外リンパ節を含む)に転移を認めるもの(画像所見による)",',
    '"1a: 胸水中に悪性細胞を認める","1b: 実質転移ならびに腹腔外臓器(鼠径リンパ節ならびに腹腔外リンパ節を含む)に転移を認めるもの",'
  )::text,
  '"X: 遠隔転移を判定するための検索が行われなかったとき"',
  '"X: 遠隔転移を判定するための検索が行われなかった"'
)::json
WHERE
schema_id_string = '/schema/OV/staging' AND
version_major = 1 AND
jsonb_path_exists(document_schema::jsonb, '$.properties.所属リンパ節');

-- /schema/OV/staging v1 ドキュメントの修正
UPDATE jesgo_document SET
document = jsonb_set_lax(
  jsonb_set(document, '{"領域リンパ節"}', document->'所属リンパ節', TRUE),
  '{"所属リンパ節"}',
  NULL,
  FALSE,
  'delete_key'
)
WHERE 
document ? '所属リンパ節' AND
schema_primary_id IN (
SELECT schema_primary_id FROM jesgo_document_schema
WHERE
  schema_id_string = '/schema/OV/staging' AND
  version_major = 1
);
UPDATE jesgo_document SET
document = jsonb_set(document, '{"cTNM", "M"}', '"X: 遠隔転移を判定するための検索が行われなかった"')
WHERE
document @@ '$.cTNM.M== "X: 遠隔転移を判定するための検索が行われなかったとき"' AND schema_primary_id IN (
SELECT schema_primary_id FROM jesgo_document_schema
WHERE
  schema_id_string = '/schema/OV/staging' AND
  version_major = 1
);

-- /schema/treatment/chemotherapyのv1 > v2 の修正に伴うドキュメント修正
UPDATE jesgo_document SET
document = jsonb_set(
  document,
  '{"治療区分"}',
  REPLACE(
    REPLACE(
      TRANSLATE((document->'治療区分')::text, '+', '＋'),
      '分子標的薬', '分子標的治療'
    ),
    '免疫チェックポイント阻害剤＋分子標的治療', '分子標的治療＋免疫チェックポイント阻害剤'
  )::jsonb,
  FALSE
  )
WHERE
  document ? '治療区分'
  AND
  schema_primary_id IN (
    SELECT schema_primary_id FROM jesgo_document_schema
    WHERE schema_id_string = '/schema/treatment/chemotherapy' AND version_major = 1
  );


--卵巣がん-病期診断 画像初見→画像所見
UPDATE jesgo_document_schema 
SET 
document_schema = (REPLACE(document_schema::text,'（画像初見などによる）', '（画像所見などによる）')::text)::json
WHERE
schema_id_string = '/schema/OV/staging' AND
version_major = 1 AND
document_schema::text LIKE '%（画像初見などによる）%';

UPDATE jesgo_document SET
document = jsonb_set(document, '{"cTNM", "N"}', '"1: 所属リンパ節に転移を認める（画像所見などによる）"')
WHERE
document @@ '$.cTNM.N== "1: 所属リンパ節に転移を認める（画像初見などによる）"' AND schema_primary_id IN (
SELECT schema_primary_id FROM jesgo_document_schema
WHERE
  schema_id_string = '/schema/OV/staging' AND
  version_major = 1
);