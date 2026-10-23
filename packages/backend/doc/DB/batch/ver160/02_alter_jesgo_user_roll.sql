-- =============================================
-- ユーザロールテーブルへの列追加（プリセット機能更新権限）
-- バージョン: 1.6.0
-- 説明: プリセットの更新（追加・編集・コピー・削除）を許可する「プリセット機能更新権限」の列を追加する。
--       列を追加したときだけ、初期値として次の権限に付与する（roll_id で識別し、権限名称では判定しない）。
--         roll_id 0   : システム管理者
--         roll_id 100 : 上級ユーザ（施設が名称を変えていても同じ権限に付く）
--       上記以外（システムオペレーター・一般ユーザ・ログ用ユーザ・退職者・施設が追加した権限）は付与しない（FALSE）。
--       プラグイン登録権限を含む既存の権限の値は変更しない。roll_id 100 が無い・削除済みの DB でもエラーにならない。
--       何度実行しても結果は変わらない（列が既にある場合は何もしない。施設が適用後に権限管理タブで変えた値を上書きしない）。
-- 適用後の影響（利用者から見える変更）:
--       ・上級ユーザ（roll_id 100）がプリセットを更新できるようになる。
--       ・プラグイン登録権限だけでプリセットを更新していた施設独自の権限は、更新できなくなる（閲覧のみ）。
--         必要であれば、権限管理タブで「プリセット機能更新権限」を付ける。
-- 未適用のまま v1.6.0 のプログラムを動かした場合:
--       ログイン・症例・患者リスト・他の管理画面は従来どおり動く。プリセットの更新は全員「権限なし」（閲覧のみ）となり、
--       バックエンドのログに未適用である旨を出力する。
-- 切り戻し: ALTER TABLE jesgo_user_roll DROP COLUMN IF EXISTS preset_updatable;
--           （切り戻すと各権限のプリセット機能更新権限の設定内容は失われる。v1.6.0 のプログラムではプリセットの更新が
--             全員不可（閲覧のみ）になる。v1.5.x 以前のプログラムでは従来どおりプラグイン登録権限で判定される。
--             症例データ・プリセットの登録内容には影響しない）
-- =============================================

-- クライアントエンコーディングをUTF-8に設定
SET client_encoding = 'UTF8';

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT * FROM information_schema.columns
		WHERE table_schema = current_schema() AND table_name = 'jesgo_user_roll' AND column_name = 'preset_updatable'
	) THEN
		ALTER TABLE jesgo_user_roll ADD COLUMN preset_updatable boolean NOT NULL DEFAULT FALSE;

		-- システム管理者・上級ユーザ
		UPDATE jesgo_user_roll SET preset_updatable = TRUE WHERE roll_id IN (0, 100);

		RAISE NOTICE 'jesgo_user_rollにpreset_updatableを追加しました';
	ELSE
		RAISE NOTICE 'jesgo_user_rollにpreset_updatableを追加済みのためスキップ';
	END IF;
END $$;

COMMENT ON COLUMN jesgo_user_roll.preset_updatable IS 'プリセット機能更新権限（プリセットの追加・編集・コピー・削除。TRUE:可／FALSE:不可）';
