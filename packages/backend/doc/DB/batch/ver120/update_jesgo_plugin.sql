UPDATE public.jesgo_plugin
SET deleted = true
WHERE plugin_name in
(
	'子宮頸がん登録確認 (2023-2024)',
	'子宮体がん登録確認 (2023-2024)',
	'卵巣がん登録確認 (2023-2024)',
	'外部スクリプトの実行',
	'外部スクリプトの実行(個別)'
);

UPDATE public.jesgo_plugin
SET plugin_name = '子宮頸がん個別チェック(2023-2024)'
WHERE plugin_name = '子宮頸がん個別確認 (2023-2024)';

UPDATE public.jesgo_plugin
SET plugin_name = '子宮体がん個別チェック(2023-2024)'
WHERE plugin_name = '子宮体がん個別確認 (2023-2024)';

UPDATE public.jesgo_plugin
SET plugin_name = '卵巣がん個別チェック(2023-2024)'
WHERE plugin_name = '卵巣がん個別確認 (2023-2024)';

UPDATE public.jesgo_plugin
SET plugin_name = '患者文書出力(個別)'
WHERE plugin_name = '単一患者のJESGO JSONドキュメント出力';