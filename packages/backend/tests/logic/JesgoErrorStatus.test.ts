import { getJesgoErrorStatus } from '../../backendapp/logic/JesgoErrorStatus';

// 文書のエラー情報（jesgo:error）から患者リストの印を判定する処理のテスト
// データベースには接続しない。値はテスト用の架空のもののみを使う

const status = (hasWarn: boolean, hasError: boolean, hasUnreadableValue = false) => ({
  hasWarn,
  hasError,
  hasUnreadableValue,
});

describe('印を付けない値', () => {
  test.each([
    ['未設定', undefined],
    ['null', null],
    ['空の配列', []],
    ['null だけの配列', [null, null]],
  ])('%s', (_label, value) => {
    expect(getJesgoErrorStatus(value)).toEqual(status(false, false));
  });
});

describe('文字列（従来どおり）', () => {
  test('「要修正」を含めば「エラーあり」', () => {
    expect(getJesgoErrorStatus(['要修正: 腫瘍径'])).toEqual(status(false, true));
  });
  test('「要確認」を含めば「要確認」', () => {
    expect(getJesgoErrorStatus(['要確認: 腫瘍径'])).toEqual(status(true, false));
  });
  test('両方を含む', () => {
    expect(getJesgoErrorStatus(['要確認: A', '要修正: B'])).toEqual(status(true, true));
    expect(getJesgoErrorStatus(['要確認・要修正'])).toEqual(status(true, true));
  });
  test('どちらも含まない文字列は印を付けない', () => {
    expect(getJesgoErrorStatus(['お知らせ'])).toEqual(status(false, false));
  });
  test('null の要素は判定に使わず、他の要素で判定する', () => {
    expect(getJesgoErrorStatus(['要修正: A', null])).toEqual(status(false, true));
    expect(getJesgoErrorStatus([null, '要確認: A'])).toEqual(status(true, false));
  });
});

describe('オブジェクト（製品の仕様の形 { "項目名": "文字列" }）', () => {
  test('値の文字列に同じ規則を当てはめる', () => {
    expect(getJesgoErrorStatus([{ 腫瘍径: '要修正: 範囲外' }])).toEqual(status(false, true));
    expect(getJesgoErrorStatus([{ 腫瘍径: '要確認: 範囲外', 病期: 'メモ' }])).toEqual(
      status(true, false)
    );
  });
  test('文字列と混在', () => {
    expect(getJesgoErrorStatus(['要確認: A', { 項目: '要修正: B' }])).toEqual(status(true, true));
  });
  test('空のオブジェクトは印を付けない', () => {
    expect(getJesgoErrorStatus([{}])).toEqual(status(false, false));
  });
});

describe('読み取れない値は「エラーあり」', () => {
  test.each([
    ['数値', [1]],
    ['真偽値', [true]],
    ['配列の入れ子', [['要確認: A']]],
    ['値が文字列でないオブジェクト', [{ 項目: 1 }]],
    ['値が null のオブジェクト', [{ 項目: null }]],
    ['値が入れ子のオブジェクト', [{ 項目: { 詳細: '要確認' } }]],
  ])('%s', (_label, value) => {
    expect(getJesgoErrorStatus(value)).toEqual(status(false, true, true));
  });

  test('文字列と混在しても、読める文字列の印は付ける', () => {
    expect(getJesgoErrorStatus(['要確認: A', 2])).toEqual(status(true, true, true));
  });

  test.each([
    ['文字列', '要確認: A'],
    ['オブジェクト', { 項目: '要確認: A' }],
    ['数値', 3],
    ['真偽値', false],
  ])('jesgo:error 自体が配列でない（%s）', (_label, value) => {
    expect(getJesgoErrorStatus(value)).toEqual(status(false, true, true));
  });
});
