import * as fs from 'fs';
import * as path from 'path';
import {
  FinalizeVersionedValuesForSave,
  FindVersionMismatchGuides,
  FindVersionMismatchValues,
  HasVersionMismatchValue,
  IsSaveBlockingVersionMismatch,
  NormalizeVersionedValues,
  VersionedSchema,
} from '@jesgo/common';

// スキーマの版の切り替えで形が変わった値の扱いのテスト
// データベースには接続しない。症例データはテスト用の架空の値のみを使う

type Doc = { [key: string]: unknown };

const PROFILE = '分子遺伝学的プロファイル';

// 2026 年版（3.0）はリポジトリの登録スキーマを使う
const schema2026 = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../../../../schema/EM/pathology.json'),
    'utf8'
  )
) as VersionedSchema;

// 2025 年版（2.0）相当: POLE変異・p53 が 1 つの値
const schema2025: VersionedSchema = {
  type: 'object',
  properties: {
    組織型: { type: 'string' },
    [PROFILE]: {
      type: 'object',
      properties: {
        POLE変異: { type: 'string' },
        'MMR/MSI': { type: 'string' },
        p53: { type: 'string' },
      },
    },
  },
};

// 2023 年版（1.1）相当: 分子遺伝学的プロファイルが無い
const schema2023: VersionedSchema = {
  type: 'object',
  properties: { 組織型: { type: 'string' } },
};

const profileOf = (doc: Doc): Doc => doc[PROFILE] as Doc;

describe('版と形の合わない値の判定（患者リストの「エラーあり」）', () => {
  test('正しく入力した 2026 年版・2025 年版の文書は対象にならず、値も変わらない', () => {
    const d2026: Doc = {
      [PROFILE]: {
        POLE変異: { POLE変異: 'なし', POLE変異検査方法: 'NGS法' },
        p53: { p53: '野生型' },
      },
    };
    const d2025: Doc = {
      [PROFILE]: { POLE変異: 'なし', 'MMR/MSI': '不明', p53: '野生型' },
    };
    expect(HasVersionMismatchValue(d2026, schema2026)).toBe(false);
    expect(HasVersionMismatchValue(d2025, schema2025)).toBe(false);
    expect(NormalizeVersionedValues(d2026, schema2026)).toBe(d2026);
    expect(FinalizeVersionedValuesForSave(d2025, schema2025)).toBe(d2025);
  });

  test('旧版にしかない項目（MMR/MSI）・選択肢だけ変わった値・jesgo:error は対象にならない', () => {
    const doc: Doc = {
      組織型: '旧版の選択肢',
      'jesgo:error': [{ 0: 'x' }],
      [PROFILE]: { 'MMR/MSI': '不明', POLE変異: { POLE変異: 'あり' } },
    };
    expect(FindVersionMismatchValues(doc, schema2026)).toEqual([]);
  });

  test('2026 年版に 2025 年版の文字列が残る文書は対象になり、保存しても新しい欄が空なら残る', () => {
    const doc: Doc = { [PROFILE]: { POLE変異: 'なし' } };
    expect(FindVersionMismatchValues(doc, schema2026)[0].kind).toBe('shape_mismatch');
    const saved = FinalizeVersionedValuesForSave(doc, schema2026);
    expect(profileOf(saved).POLE変異).toEqual({ 'POLE変異（切り替え前の値）': 'なし' });
    const after = FindVersionMismatchValues(saved, schema2026);
    expect(after).toHaveLength(1);
    expect(after[0]).toEqual({
      path: [PROFILE, 'POLE変異', 'POLE変異'],
      kind: 'old_value',
      hasCurrentField: true,
      newValueFilled: false,
    });
  });

  test('分解された形で新しい欄に値がある文書: 表示では旧値も見え、保存すると旧値が除かれ対象から外れる', () => {
    const doc: Doc = { [PROFILE]: { POLE変異: { 0: 'な', 1: 'し', POLE変異: 'あり' } } };
    expect(FindVersionMismatchValues(doc, schema2026)[0].kind).toBe('decomposed');
    const shown = NormalizeVersionedValues(doc, schema2026);
    expect(profileOf(shown).POLE変異).toEqual({
      POLE変異: 'あり',
      'POLE変異（切り替え前の値）': 'なし',
    });
    // 置き直しは 2 回目以降は変わらない（同じ参照）
    expect(NormalizeVersionedValues(shown, schema2026)).toBe(shown);
    const saved = FinalizeVersionedValuesForSave(doc, schema2026);
    expect(profileOf(saved).POLE変異).toEqual({ POLE変異: 'あり' });
    expect(HasVersionMismatchValue(saved, schema2026)).toBe(false);
  });

  test('検査方法だけを入力して保存した場合は旧値が残り、対象のまま', () => {
    const doc: Doc = {
      [PROFILE]: {
        POLE変異: { 'POLE変異（切り替え前の値）': 'なし', POLE変異検査方法: 'NGS法' },
      },
    };
    const saved = FinalizeVersionedValuesForSave(doc, schema2026);
    expect(saved).toBe(doc);
    expect(HasVersionMismatchValue(saved, schema2026)).toBe(true);
  });

  test('2025 年版に 2026 年版のまとまりが残る文書は対象になり、2025 年版の欄に入力して保存すると外れる', () => {
    const doc: Doc = {
      [PROFILE]: { POLE変異: { POLE変異: 'なし', POLE変異検査方法: 'NGS法' } },
    };
    expect(HasVersionMismatchValue(doc, schema2025)).toBe(true);
    const shown = NormalizeVersionedValues(doc, schema2025);
    expect(profileOf(shown).POLE変異).toBeUndefined();
    const filled: Doc = { [PROFILE]: { ...profileOf(shown), POLE変異: 'なし' } };
    const saved = FinalizeVersionedValuesForSave(filled, schema2025);
    expect(saved).toEqual({ [PROFILE]: { POLE変異: 'なし' } });
    expect(HasVersionMismatchValue(saved, schema2025)).toBe(false);
  });

  test('2023 年版の文書に分解された形が入っている場合は対象になり（入力し直す欄は無い）、置き直しはしない', () => {
    const doc: Doc = { 組織型: 'x', [PROFILE]: { POLE変異: { 0: 'な', 1: 'し' } } };
    expect(NormalizeVersionedValues(doc, schema2023)).toBe(doc);
    const findings = FindVersionMismatchValues(doc, schema2023);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('decomposed');
    expect(findings[0].hasCurrentField).toBe(false);
    // × で消して保存した後
    expect(HasVersionMismatchValue({ 組織型: 'x' }, schema2023)).toBe(false);
  });

  test('参照（#/$defs）を解決して形を比べる', () => {
    const schema: VersionedSchema = {
      type: 'object',
      $defs: { grp: { type: 'object', properties: { a: { type: 'string' } } } },
      properties: { g: { type: 'object', properties: { x: { $ref: '#/$defs/grp' } } } },
    };
    expect(FindVersionMismatchValues({ g: { x: 'old' } }, schema)[0].kind).toBe(
      'shape_mismatch'
    );
  });

  test('数値と文字列の違い・最上位の項目は対象にしない', () => {
    const schema: VersionedSchema = {
      type: 'object',
      properties: { g: { type: 'object', properties: { MSI: { type: 'string' } } } },
    };
    expect(HasVersionMismatchValue({ g: { MSI: 12.5 } }, schema)).toBe(false);
    expect(HasVersionMismatchValue({ [PROFILE]: 'なし' }, schema2026)).toBe(false);
  });
});

describe('症例登録画面の案内（患者リストの印との一致）', () => {
  const cases: { name: string; doc: Doc; schema: VersionedSchema }[] = [
    { name: '正しい 2026 年版', doc: { [PROFILE]: { POLE変異: { POLE変異: 'なし' } } }, schema: schema2026 },
    { name: 'MMR/MSI だけ', doc: { [PROFILE]: { 'MMR/MSI': '不明' } }, schema: schema2026 },
    { name: 'G（2026 に文字列）', doc: { [PROFILE]: { POLE変異: 'なし' } }, schema: schema2026 },
    { name: 'H/I（分解＋新しい欄あり）', doc: { [PROFILE]: { POLE変異: { 0: 'な', 1: 'し', POLE変異: 'あり' } } }, schema: schema2026 },
    { name: '分解のみ', doc: { [PROFILE]: { p53: { 0: '野', 1: '生', 2: '型' } } }, schema: schema2026 },
    { name: 'K（2025 にまとまり）', doc: { [PROFILE]: { POLE変異: { POLE変異: 'なし' } } }, schema: schema2025 },
    { name: 'H25（2025 に分解）', doc: { [PROFILE]: { POLE変異: { 0: 'な', 1: 'し', POLE変異: 'なし' } } }, schema: schema2025 },
    { name: '2023 年版に分解', doc: { 組織型: 'x', [PROFILE]: { POLE変異: { 0: 'な', 1: 'し' } } }, schema: schema2023 },
  ];

  test.each(cases)('開いた直後の案内の有無が患者リストの印と一致する: $name', ({ doc, schema }) => {
    const shown = NormalizeVersionedValues(doc, schema);
    expect(FindVersionMismatchGuides(shown, shown, schema).length > 0).toBe(
      HasVersionMismatchValue(doc, schema)
    );
    // 開いた時点の値が DB の値のまま（置き直す前）でも同じ
    expect(FindVersionMismatchGuides(shown, doc, schema).length > 0).toBe(
      HasVersionMismatchValue(doc, schema)
    );
  });

  test('新しい欄に値がある崩れた症例（case 17 の形）は、新しい欄の値が正となる旨の対象として案内される', () => {
    const doc: Doc = { [PROFILE]: { POLE変異: { 0: 'な', 1: 'し', POLE変異: 'あり' } } };
    const guides = FindVersionMismatchGuides(NormalizeVersionedValues(doc, schema2026), doc, schema2026);
    expect(guides).toEqual([
      { path: [PROFILE, 'POLE変異', 'POLE変異'], kind: 'old_value', hasCurrentField: true, newValueFilled: true },
    ]);
    // 保存すると案内も印も無くなる
    const saved = FinalizeVersionedValuesForSave(doc, schema2026);
    expect(FindVersionMismatchGuides(saved, saved, schema2026)).toEqual([]);
    expect(HasVersionMismatchValue(saved, schema2026)).toBe(false);
  });

  test('開いた後に新しい欄へ入力した項目は、入力した時点で案内が消える（従来どおり）', () => {
    const opened: Doc = { [PROFILE]: { POLE変異: 'なし' } };
    const shown = NormalizeVersionedValues(opened, schema2026);
    expect(FindVersionMismatchGuides(shown, shown, schema2026)).toHaveLength(1);
    const edited: Doc = {
      [PROFILE]: { POLE変異: { ...(profileOf(shown).POLE変異 as Doc), POLE変異: 'あり' } },
    };
    expect(FindVersionMismatchGuides(edited, shown, schema2026)).toEqual([]);
  });
});

describe('保存を止める対象（新しい欄が空のまま切り替え前の値だけが残っているもの）', () => {
  // 画面の保存前の検証と同じ手順: 表示・編集中の値で案内を求め、保存を止める対象だけを取り出す
  const blockingOf = (current: Doc, baseline: Doc | undefined, schema: VersionedSchema) =>
    FindVersionMismatchGuides(current, baseline, schema).filter(IsSaveBlockingVersionMismatch);

  test('2025 年 → 2026 年で新しい欄が空のままなら保存できない。× で消すと保存でき、旧値は残らない', () => {
    const opened: Doc = { [PROFILE]: { POLE変異: 'なし', p53: '野生型' } };
    const shown = NormalizeVersionedValues(opened, schema2026);
    expect(blockingOf(shown, shown, schema2026).map((f) => f.path)).toEqual([
      [PROFILE, 'POLE変異', 'POLE変異'],
      [PROFILE, 'p53', 'p53'],
    ]);
    // × で両方の旧値を消す（まとまりは空になる）
    const removed: Doc = { [PROFILE]: { POLE変異: {}, p53: {} } };
    expect(blockingOf(removed, shown, schema2026)).toEqual([]);
    const saved = FinalizeVersionedValuesForSave(removed, schema2026);
    expect(HasVersionMismatchValue(saved, schema2026)).toBe(false);
    expect(JSON.stringify(saved)).not.toContain('切り替え前の値');
  });

  test('× で消した直後（項目名が残り値が undefined）は残っていないものとみなし、保存データにも項目名を残さない', () => {
    // 1 つの値の旧値を × で消した直後
    const single: Doc = {
      [PROFILE]: { p53: { 'p53（切り替え前の値）': undefined, p53検査方法: 'p53-IHC検査（IHC法）' } },
    };
    expect(blockingOf(single, single, schema2026)).toEqual([]);
    expect(FindVersionMismatchGuides(single, single, schema2026)).toEqual([]);
    expect(Object.keys(profileOf(FinalizeVersionedValuesForSave(single, schema2026)).p53 as Doc)).toEqual([
      'p53検査方法',
    ]);
    // まとまりの旧値の中の欄をすべて × で消した直後（2025 年版の文書）
    const group: Doc = {
      [PROFILE]: {
        'POLE変異（切り替え前の値）': { POLE変異: undefined, POLE変異検査方法: undefined },
      },
    };
    expect(blockingOf(group, group, schema2025)).toEqual([]);
    expect(FinalizeVersionedValuesForSave(group, schema2025)).toEqual({ [PROFILE]: {} });
    // まとまりの中の欄が 1 つでも残っていれば保存できない
    const partly: Doc = {
      [PROFILE]: {
        'POLE変異（切り替え前の値）': { POLE変異: undefined, POLE変異検査方法: 'NGS法' },
      },
    };
    expect(blockingOf(partly, partly, schema2025)).toHaveLength(1);
  });

  test('新しい欄に値を入れると保存でき、保存時に旧値が取り除かれる（現在の動きのまま）', () => {
    const shown = NormalizeVersionedValues({ [PROFILE]: { POLE変異: 'なし' } } as Doc, schema2026);
    const edited: Doc = {
      [PROFILE]: { POLE変異: { ...(profileOf(shown).POLE変異 as Doc), POLE変異: 'あり' } },
    };
    expect(blockingOf(edited, shown, schema2026)).toEqual([]);
    const saved = FinalizeVersionedValuesForSave(edited, schema2026);
    expect(profileOf(saved).POLE変異).toEqual({ POLE変異: 'あり' });
  });

  test('同名の新しい欄が空で検査方法だけを入れた場合は保存できない', () => {
    const doc: Doc = {
      [PROFILE]: {
        POLE変異: { 'POLE変異（切り替え前の値）': 'なし', POLE変異検査方法: 'NGS法' },
      },
    };
    expect(blockingOf(doc, doc, schema2026)).toHaveLength(1);
  });

  test('逆方向（2026 年 → 2025 年）でも、2025 年版の欄が空なら保存できず、入力すれば保存できる', () => {
    const opened: Doc = {
      [PROFILE]: { POLE変異: { POLE変異: 'なし', POLE変異検査方法: 'NGS法' } },
    };
    const shown = NormalizeVersionedValues(opened, schema2025);
    expect(blockingOf(shown, shown, schema2025).map((f) => f.path)).toEqual([
      [PROFILE, 'POLE変異'],
    ]);
    const filled: Doc = { [PROFILE]: { ...profileOf(shown), POLE変異: 'なし' } };
    expect(blockingOf(filled, shown, schema2025)).toEqual([]);
  });

  test('ver 1.6.0 より前に崩れた症例: 新しい欄が空なら保存できず、新しい欄に値があれば保存できる', () => {
    const emptyNew: Doc = { [PROFILE]: { p53: { 0: '野', 1: '生', 2: '型' } } };
    // 開いただけでは値を変えない（置き直しは表示用。DB の値で判定しても同じ結果）
    const shownEmpty = NormalizeVersionedValues(emptyNew, schema2026);
    expect(blockingOf(shownEmpty, emptyNew, schema2026)).toHaveLength(1);
    const filledNew: Doc = { [PROFILE]: { POLE変異: { 0: 'な', 1: 'し', POLE変異: 'あり' } } };
    const shownFilled = NormalizeVersionedValues(filledNew, schema2026);
    expect(blockingOf(shownFilled, filledNew, schema2026)).toEqual([]);
    // 案内（保存を妨げないもの）は出る
    expect(FindVersionMismatchGuides(shownFilled, filledNew, schema2026)).toHaveLength(1);
  });

  test('新しい版に無い項目（MMR/MSI）・2023 年版に残る値は保存を止めない（印・案内はこれまでどおり）', () => {
    const mmr: Doc = { [PROFILE]: { 'MMR/MSI': '不明', POLE変異: { POLE変異: 'あり' } } };
    expect(blockingOf(mmr, mmr, schema2026)).toEqual([]);
    const decomposed2023: Doc = { 組織型: 'x', [PROFILE]: { POLE変異: { 0: 'な', 1: 'し' } } };
    expect(blockingOf(decomposed2023, decomposed2023, schema2023)).toEqual([]);
    expect(HasVersionMismatchValue(decomposed2023, schema2023)).toBe(true);
    // 該当する項目が無い版に残る「切り替え前の値」も止めない（入力し直す欄が無い）
    const old2023: Doc = {
      組織型: 'x',
      [PROFILE]: { POLE変異: { 'POLE変異（切り替え前の値）': 'なし' } },
    };
    const guides = FindVersionMismatchGuides(old2023, old2023, schema2023);
    expect(guides).toHaveLength(1);
    expect(guides[0].hasCurrentField).toBe(false);
    expect(blockingOf(old2023, old2023, schema2023)).toEqual([]);
  });

  test('保存を止めない状態で保存した結果に、新しい欄が空の切り替え前の値は残らない（すべての形）', () => {
    const docs: { doc: Doc; schema: VersionedSchema }[] = [
      { doc: { [PROFILE]: { POLE変異: { POLE変異: 'なし' } } }, schema: schema2026 },
      { doc: { [PROFILE]: { 'MMR/MSI': '不明' } }, schema: schema2026 },
      { doc: { [PROFILE]: { POLE変異: 'なし' } }, schema: schema2026 },
      { doc: { [PROFILE]: { POLE変異: { 0: 'な', 1: 'し', POLE変異: 'あり' } } }, schema: schema2026 },
      { doc: { [PROFILE]: { p53: { 0: '野', 1: '生', 2: '型' } } }, schema: schema2026 },
      { doc: { [PROFILE]: { POLE変異: { POLE変異: 'なし' } } }, schema: schema2025 },
      { doc: { [PROFILE]: { POLE変異: { 0: 'な', 1: 'し', POLE変異: 'なし' } } }, schema: schema2025 },
      { doc: { 組織型: 'x', [PROFILE]: { POLE変異: { 0: 'な', 1: 'し' } } }, schema: schema2023 },
    ];
    docs.forEach(({ doc, schema }) => {
      const shown = NormalizeVersionedValues(doc, schema);
      const canSave = blockingOf(shown, doc, schema).length === 0;
      const saved = FinalizeVersionedValuesForSave(shown, schema);
      const remaining = FindVersionMismatchValues(saved, schema).filter(IsSaveBlockingVersionMismatch);
      if (canSave) {
        expect(remaining).toEqual([]);
      } else {
        // 保存を止める文書は、患者リストでも印が付く
        expect(HasVersionMismatchValue(doc, schema)).toBe(true);
      }
    });
  });
});
