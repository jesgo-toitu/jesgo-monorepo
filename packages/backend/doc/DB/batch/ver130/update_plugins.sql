UPDATE public.jesgo_plugin SET deleted = true
WHERE plugin_name IN ('子宮頸がん個別チェック(2023-2024)', '子宮体がん個別チェック(2023-2024)', '卵巣がん個別チェック(2023-2024)', '腫瘍登録スクリプト一括実行')
;