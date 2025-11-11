DO $$ BEGIN
	IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_name = 'jesgo_user_roll' AND column_name = 'plugin_registerable') THEN
		alter table jesgo_user_roll add column if not exists plugin_registerable boolean default false;
		alter table jesgo_user_roll add column if not exists plugin_executable_select boolean default false;
		alter table jesgo_user_roll add column if not exists plugin_executable_update boolean default false;
		
		--システム管理者
		update jesgo_user_roll set
			plugin_registerable = true,
			plugin_executable_select = true,
			plugin_executable_update = true
		where roll_id = 0;

		--システムデータベース
		update jesgo_user_roll set
			plugin_registerable = false,
			plugin_executable_select = true,
			plugin_executable_update = true
		where roll_id = 1;

		--上級医師
		update jesgo_user_roll set
			plugin_registerable = false,
			plugin_executable_select = true,
			plugin_executable_update = true
		where roll_id = 100;


		--一般医師
		update jesgo_user_roll set
			plugin_registerable = false,
			plugin_executable_select = true,
			plugin_executable_update = false
		where roll_id = 101;


		--看護師
		update jesgo_user_roll set
			plugin_registerable = false,
			plugin_executable_select = false,
			plugin_executable_update = false
		where roll_id = 999;

		--退職者
		update jesgo_user_roll set
			plugin_registerable = false,
			plugin_executable_select = false,
			plugin_executable_update = false
		where roll_id = 1000;
	ELSE
		RAISE NOTICE 'jesgo_user_rollにplugin_registerableを追加済みのためスキップ';
	END IF;
END $$;