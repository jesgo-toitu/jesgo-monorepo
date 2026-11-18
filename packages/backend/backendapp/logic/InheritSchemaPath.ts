/**
 * 継承スキーマ（inherit_schema）を考えたスキーマのつながり（schema_path）の扱い
 *
 * 継承スキーマの文書（例: 手術療法 詳細）は、継承元のスキーマ（例: 手術療法）の位置に置かれる。
 * プリセット項目の schema_path は継承元のスキーマの ID で保存されるため、
 * 文書を探すときは、継承元の ID を継承スキーマの ID に置き換えたつながりでも探す。
 */

/** 継承元のスキーマ ID → そのスキーマを継承するスキーマ ID の一覧 */
export type InheritSchemaMap = Map<number, number[]>;

/** 1 つのプリセット項目から作るつながりの数の上限（継承の組み合わせが増えすぎないように） */
const MAX_EXPANDED_PATHS = 64;

/**
 * DB の行（継承元のスキーマ ID と継承スキーマ ID の組）から、継承の対応表を作る
 * @param rows 継承元のスキーマ ID（schema_id）と継承スキーマ ID（inherit_id）の組
 * @returns 継承の対応表
 */
export const buildInheritSchemaMap = (
  rows: { schema_id: number | string; inherit_id: number | string | null }[]
): InheritSchemaMap => {
  const map: InheritSchemaMap = new Map();
  for (const row of rows) {
    const schemaId = Number(row.schema_id);
    const inheritId = Number(row.inherit_id);
    if (
      row.inherit_id === null ||
      Number.isNaN(schemaId) ||
      Number.isNaN(inheritId) ||
      schemaId === inheritId
    ) {
      continue;
    }
    const list = map.get(schemaId) ?? [];
    if (!list.includes(inheritId)) list.push(inheritId);
    map.set(schemaId, list);
  }
  return map;
};

/**
 * スキーマのつながりの各位置を、継承スキーマに置き換えたつながりも含めて返す
 * 例: [3, 51, 52, 55]（52 を 53 が継承）→ [[3, 51, 52, 55], [3, 51, 53, 55]]
 * @param schemaPath スキーマのつながり
 * @param inheritMap 継承の対応表
 * @returns 元のつながりを先頭にした、つながりの一覧（つながりが無い場合は元の値だけ）
 */
export const expandSchemaPathWithInherit = (
  schemaPath: number[] | null | undefined,
  inheritMap: InheritSchemaMap
): (number[] | null | undefined)[] => {
  if (!Array.isArray(schemaPath) || schemaPath.length === 0) return [schemaPath];
  let paths: number[][] = [[]];
  for (const id of schemaPath) {
    const schemaId = Number(id);
    const candidates = [schemaId, ...(inheritMap.get(schemaId) ?? [])];
    const next: number[][] = [];
    for (const path of paths) {
      for (const candidate of candidates) {
        if (next.length >= MAX_EXPANDED_PATHS) break;
        next.push([...path, candidate]);
      }
    }
    paths = next;
  }
  return paths;
};
