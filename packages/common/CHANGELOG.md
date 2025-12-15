# @jesgo/common - 変更履歴

## [1.5.0] - 2025-10-11

### 追加
- 初期リリース
- Frontend/Backend共通パッケージの構築
- API関連の型定義と定数を共通化
  - `ApiReturnObject`: API通信の戻り値型
  - `RESULT`: API結果コード定数
  - `METHOD_TYPE`: HTTPメソッドタイプ定数
- 日付関連のユーティリティ関数を共通化
  - `formatDate()`: 日付フォーマット変換
  - `formatTime()`: 時刻フォーマット変換
  - `formatDateStr()`: 日付文字列フォーマット変換
  - `calcAge()`: 年齢計算
  - `isDate()`, `isDateStr()`: 日付妥当性チェック
  - `isAgoYearFromNow()`: 満N年経過チェック
- JESGO定数とJSON Pointer関連ユーティリティを共通化
  - `Const.JESGO_TAG`: JESGOタグ定義
  - `Const.UI_WIDGET`: UIスキーマプロパティ
  - `Const.EX_VOCABULARY`: 拡張ボキャブラリー
  - `jesgo_tagging()`: JESGOタグ文字列生成
  - `isPointerWithArray()`, `getPointerArrayNum()`, `getPointerTrimmed()`: JSON Pointer操作
- 文字列・配列ユーティリティを共通化
  - `escapeText()`: テキストエスケープ
  - `generateUuid()`: UUID生成
  - `getArrayWithSafe()`: 安全な配列要素取得
- バリデーション関連を共通化
  - `StaffErrorMessage`: スタッフエラーメッセージ定義
  - `LOGINID_PATTERN`: ログインID検証用正規表現
  - `PASSWORD_PATTERN`: パスワード検証用正規表現

### 変更
- frontendとbackendで重複していたコードを共通パッケージに統合
- 両パッケージから`@jesgo/common`をインポートするように変更

### 修正
- TypeScript strict modeでのビルドエラーを解決
- 型定義の一貫性を確保

