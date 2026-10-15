export type staffData = {
  user_id: number;
  name: string;
  display_name: string;
  roll_id: number;
  rolltitle: string;
  // 利用者ごとの設定: 保存確認ダイアログを表示しない(true)／表示する(false)
  hide_save_confirm?: boolean;
};

export default staffData;
