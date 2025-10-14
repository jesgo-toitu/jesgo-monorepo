INSERT INTO public.jesgo_plugin_group VALUES (1, '患者データ一括取込', false, false, NOW())
ON CONFLICT (plugin_group_id)
DO NOTHING;