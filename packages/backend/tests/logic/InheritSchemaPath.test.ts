import {
  buildInheritSchemaMap,
  expandSchemaPathWithInherit,
} from '../../backendapp/logic/InheritSchemaPath';

describe('buildInheritSchemaMap', () => {
  test('継承元ごとに継承スキーマをまとめる（重複・自分自身・null は除く）', () => {
    const map = buildInheritSchemaMap([
      { schema_id: 52, inherit_id: 53 },
      { schema_id: 52, inherit_id: 53 },
      { schema_id: '78', inherit_id: '79' },
      { schema_id: 10, inherit_id: 10 },
      { schema_id: 11, inherit_id: null },
    ]);
    expect(map.get(52)).toEqual([53]);
    expect(map.get(78)).toEqual([79]);
    expect(map.has(10)).toBe(false);
    expect(map.has(11)).toBe(false);
  });
});

describe('expandSchemaPathWithInherit', () => {
  const map = buildInheritSchemaMap([
    { schema_id: 52, inherit_id: 53 },
    { schema_id: 78, inherit_id: 79 },
  ]);

  test('継承の無いつながりはそのまま', () => {
    expect(expandSchemaPathWithInherit([3, 1, 23], map)).toEqual([[3, 1, 23]]);
  });

  test('途中の位置の継承元を継承スキーマに置き換えたつながりを足す（元のつながりが先頭）', () => {
    expect(expandSchemaPathWithInherit([3, 51, 52, 55], map)).toEqual([
      [3, 51, 52, 55],
      [3, 51, 53, 55],
    ]);
  });

  test('先頭の位置（共通のスキーマのプリセット）も置き換える', () => {
    expect(expandSchemaPathWithInherit([78, 55], map)).toEqual([
      [78, 55],
      [79, 55],
    ]);
  });

  test('つながりが無い項目は元の値だけを返す', () => {
    expect(expandSchemaPathWithInherit(null, map)).toEqual([null]);
    expect(expandSchemaPathWithInherit([], map)).toEqual([[]]);
  });
});
