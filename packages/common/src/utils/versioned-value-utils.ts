/**
 * スキーマの版の切り替えで「項目の形（文字列／まとまり）」が変わった場合の値の扱い
 *
 * 版の切り替えで、ある項目の形が 文字列 → まとまり（またはその逆）に変わると、
 * 入力済みの値は形の合わない位置に残る。そのままでは
 * - 画面に表示されない（新しい欄が空欄に見える）
 * - まとまりの中の欄を変えたときに、文字列が 1 文字ずつ（{"0":"な","1":"し"}）に分解される
 * - ロジカルチェック・腫瘍登録の書き出しが、形の合わない値を「入力済み」とみなす
 * といった問題が起きる。
 *
 * ここでは、形の合わない値を「切り替え前の値」として、読み取り専用で見える形に置き直す。
 * - 値の意味は変えない。新しい欄へ自動で移さない（新しい欄は空欄のまま）
 * - 旧値は × で消せる（スキーマに無い項目と同じ既存の扱い）
 * - 同じ項目の新しい欄に値を入れて保存したときは、その項目の旧値を取り除く
 * - 新しい欄が空のまま旧値だけが残っているときは保存できない（IsSaveBlockingVersionMismatch）
 *
 * あわせて、版と形の合わない値が文書に残っているかを判定する（患者リストの「エラーあり」と、
 * 症例登録画面のエラー一覧で使う）。判定は読み取りのみで、文書を書き換えない。
 *
 * フロントエンド（表示・保存）とバックエンド（患者リスト）で同じ規則を使うため、本ライブラリに置く。
 *
 * 文書の最上位の項目は対象にしない（最上位の項目の型が変わる場合は既存の扱いのまま）。
 * 数値 ⇔ 文字列のような、1 つの値どうしの型の違いは対象にしない（値が分解されないため）。
 */

/**
 * 本処理が参照するスキーマの部分（JSON Schema draft-07 の一部）
 * json-schema の JSONSchema7 はそのまま渡せる
 */
export interface VersionedSchema {
  type?: string | string[];
  properties?: { [key: string]: VersionedSchemaDefinition };
  items?: VersionedSchemaDefinition | VersionedSchemaDefinition[];
  then?: VersionedSchemaDefinition;
  else?: VersionedSchemaDefinition;
  allOf?: VersionedSchemaDefinition[];
  $ref?: string;
  $defs?: { [key: string]: VersionedSchemaDefinition };
}
export type VersionedSchemaDefinition = VersionedSchema | boolean;

/** 旧値を置く項目名の後ろに付ける文言 */
export const OLD_VALUE_LABEL = '（切り替え前の値）';

/** 分解されていた文字列を戻した値を、まとまりの旧値の中に置くときの項目名 */
export const RESTORED_ORIGINAL_KEY = '分解されていた元の値';

/** プラグインが書き込むエラー情報の項目名（判定の対象外） */
const JESGO_ERROR_KEY = 'jesgo:error';

type JsonObject = { [key: string]: unknown };

/** 参照（$ref）の解決に使う文書のスキーマの最上位 */
type SchemaContext = { root: VersionedSchema | undefined };

const isPlainObject = (value: unknown): value is JsonObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isPrimitive = (value: unknown): value is string | number | boolean =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean';

/** 値が空か（未入力・空文字・空のまとまり・空の配列） */
export const isEmptyVersionedValue = (value: unknown): boolean => {
  if (value === undefined || value === null || value === '') return true;
  if (Array.isArray(value)) return value.every((v) => isEmptyVersionedValue(v));
  if (isPlainObject(value)) {
    return Object.values(value).every((v) => isEmptyVersionedValue(v));
  }
  return false;
};

const OLD_KEY_PATTERN = /^(.*)（切り替え前の値(?:・\d+)?）$/;

/** 旧値の項目名か */
export const isOldValueKey = (key: string): boolean => OLD_KEY_PATTERN.test(key);

/** 旧値の項目名から、元の項目名を取り出す */
export const getBaseNameOfOldValueKey = (key: string): string | undefined => {
  const m = OLD_KEY_PATTERN.exec(key);
  return m ? m[1] : undefined;
};

/** まだ使われていない旧値の項目名を作る */
const newOldValueKey = (container: JsonObject, name: string): string => {
  let key = `${name}${OLD_VALUE_LABEL}`;
  for (let i = 2; key in container; i += 1) {
    key = `${name}（切り替え前の値・${i}）`;
  }
  return key;
};

/**
 * 1 文字ずつに分解された文字列（{"0":"な","1":"し", ...}）を元に戻す
 * @param value まとまりの値
 * @param definedKeys スキーマに定義されている項目名（"0" などがスキーマにある場合は分解とみなさない）
 * @returns 戻した文字列と、分解された部分を除いた残り。分解されていなければ undefined
 */
export const restoreDecomposedString = (
  value: JsonObject,
  definedKeys: string[] = []
): { restored: string; rest: JsonObject } | undefined => {
  const digitKeys = Object.keys(value).filter((k) => /^\d+$/.test(k));
  if (digitKeys.length === 0) return undefined;
  if (digitKeys.some((k) => definedKeys.includes(k))) return undefined;
  const sorted = digitKeys.map((k) => Number(k)).sort((a, b) => a - b);
  // 0 から連番であること、各値が 1 文字の文字列であること
  if (!sorted.every((n, i) => n === i)) return undefined;
  const chars = sorted.map((n) => value[String(n)]);
  if (!chars.every((c) => typeof c === 'string' && c.length === 1)) {
    return undefined;
  }
  const rest: JsonObject = {};
  Object.entries(value).forEach(([k, v]) => {
    if (!digitKeys.includes(k)) rest[k] = v;
  });
  return { restored: (chars as string[]).join(''), rest };
};

/** 定義を参照（#/$defs/...）まで解決してスキーマとして返す */
const asSchema = (
  def: VersionedSchemaDefinition | undefined,
  ctx: SchemaContext
): VersionedSchema | undefined => {
  let current = def;
  // 参照の連鎖は浅いが、循環に備えて回数を区切る
  for (let i = 0; i < 10; i += 1) {
    if (!current || typeof current !== 'object') return undefined;
    const ref = current.$ref;
    if (typeof ref !== 'string') return current;
    const m = /^#\/\$defs\/(.+)$/.exec(ref);
    if (!m || !ctx.root?.$defs) return undefined;
    current = ctx.root.$defs[m[1]];
  }
  return undefined;
};

/** スキーマが求める値の形 */
const kindOf = (
  schema: VersionedSchema | undefined
): 'object' | 'array' | 'primitive' | undefined => {
  if (!schema || schema.type === undefined || Array.isArray(schema.type)) {
    return undefined;
  }
  switch (schema.type) {
    case 'object':
      return 'object';
    case 'array':
      return 'array';
    case 'string':
    case 'number':
    case 'integer':
    case 'boolean':
      return 'primitive';
    default:
      return undefined;
  }
};

/** まとまりのスキーマから、項目のスキーマを引く（then / else / allOf にしかない項目も見る） */
const getPropertySchema = (
  schema: VersionedSchema | undefined,
  key: string,
  ctx: SchemaContext
): VersionedSchema | undefined => {
  if (!schema) return undefined;
  const direct = asSchema(schema.properties?.[key], ctx);
  if (direct) return direct;
  const candidates: VersionedSchema[] = [];
  [schema.then, schema.else]
    .map((s) => asSchema(s, ctx))
    .forEach((s) => {
      const p = asSchema(s?.properties?.[key], ctx);
      if (p) candidates.push(p);
    });
  (schema.allOf ?? []).forEach((s) => {
    const p = getPropertySchema(asSchema(s, ctx), key, ctx);
    if (p) candidates.push(p);
  });
  // 定義によって形が違う場合は判断しない
  const kinds = new Set(candidates.map((c) => kindOf(c)));
  return kinds.size === 1 ? candidates[0] : undefined;
};

/** 配列の項目のスキーマ */
const getItemSchema = (
  schema: VersionedSchema,
  ctx: SchemaContext
): VersionedSchema | undefined =>
  asSchema(Array.isArray(schema.items) ? schema.items[0] : schema.items, ctx);

const definedKeysOf = (schema: VersionedSchema | undefined): string[] =>
  schema?.properties ? Object.keys(schema.properties) : [];

/**
 * まとまり（グループ）に、新しい欄の値が入っているか
 * - まとまりの中に、まとまりと同じ名前の欄があれば（例: POLE変異 > POLE変異）、その欄を見る
 * - 無ければ、スキーマに定義された欄のどれかに値があるかを見る
 */
const hasNewValue = (
  group: JsonObject,
  groupName: string,
  groupSchema: VersionedSchema | undefined
): boolean => {
  const defined = definedKeysOf(groupSchema);
  if (defined.includes(groupName)) return !isEmptyVersionedValue(group[groupName]);
  return defined.some((k) => !isEmptyVersionedValue(group[k]));
};

/**
 * 形の合わない値を「切り替え前の値」として置き直す（表示・保存時）
 * 値に変更が無ければ、受け取ったものと同じ参照を返す
 * @param value 文書またはまとまりの値
 * @param schema 値に対応するスキーマ
 * @param isDocumentRoot 文書の最上位か（最上位の項目は対象にしない）
 */
const normalizeObject = (
  value: JsonObject,
  schema: VersionedSchema | undefined,
  isDocumentRoot: boolean,
  ctx: SchemaContext
): JsonObject => {
  let out: JsonObject | undefined;
  const target = (): JsonObject => {
    if (!out) out = { ...value };
    return out;
  };

  Object.entries(value).forEach(([key, v]) => {
    const propSchema = getPropertySchema(schema, key, ctx);
    const kind = kindOf(propSchema);
    if (!propSchema || kind === undefined) return;

    if (kind === 'object') {
      if (!isDocumentRoot && isPrimitive(v) && v !== '') {
        // まとまりの位置に文字列などが残っている → まとまりの中の旧値にする
        target()[key] = { [`${key}${OLD_VALUE_LABEL}`]: v };
        return;
      }
      if (isPlainObject(v)) {
        let group = v;
        if (!isDocumentRoot) {
          const decomposed = restoreDecomposedString(group, definedKeysOf(propSchema));
          if (decomposed) {
            // 分解された文字列は元の文字列に戻し、旧値として残す。
            // 新しい欄に値がある場合も、保存するまでは旧値を見せ、新しい欄の値との食い違いに気づけるようにする。
            // 保存時（FinalizeVersionedValuesForSave）に、新しい欄に値があれば旧値を取り除く
            group = {
              ...decomposed.rest,
              [newOldValueKey(decomposed.rest, key)]: decomposed.restored,
            };
          }
        }
        const inner = normalizeObject(group, propSchema, false, ctx);
        if (inner !== v) target()[key] = inner;
      }
      return;
    }

    if (kind === 'primitive') {
      if (!isDocumentRoot && (isPlainObject(v) || Array.isArray(v))) {
        // 文字列などの位置に、まとまり（別の版の値）が残っている → 同じ階層の旧値にする
        let oldValue: unknown = v;
        if (isPlainObject(v)) {
          const decomposed = restoreDecomposedString(v);
          const rest = decomposed ? decomposed.rest : v;
          // 往復で入れ子の旧値になった場合はほどく
          const restKeys = Object.keys(rest);
          const unwrapped =
            restKeys.length === 1 && getBaseNameOfOldValueKey(restKeys[0]) === key
              ? rest[restKeys[0]]
              : rest;
          if (decomposed) {
            oldValue = isEmptyVersionedValue(unwrapped)
              ? decomposed.restored
              : { ...(unwrapped as JsonObject), [RESTORED_ORIGINAL_KEY]: decomposed.restored };
          } else {
            oldValue = unwrapped;
          }
        }
        const t = target();
        delete t[key];
        if (!isEmptyVersionedValue(oldValue)) {
          t[newOldValueKey(t, key)] = oldValue;
        }
      }
      return;
    }

    if (kind === 'array' && Array.isArray(v)) {
      const itemSchema = getItemSchema(propSchema, ctx);
      if (kindOf(itemSchema) !== 'object') return;
      let changed = false;
      const items = v.map((item: unknown) => {
        if (!isPlainObject(item)) return item;
        const n = normalizeObject(item, itemSchema, false, ctx);
        if (n !== item) changed = true;
        return n;
      });
      if (changed) target()[key] = items;
    }
  });

  // 同じ階層に置かれた旧値のうち、元の項目が「まとまり」になったものは、そのまとまりの中へ移す
  // （日付を行き来した場合に、旧値が項目のまとまりの外に残らないようにする）
  if (!isDocumentRoot) {
    Object.keys(out ?? value).forEach((key) => {
      const base = getBaseNameOfOldValueKey(key);
      if (base === undefined) return;
      const baseSchema = getPropertySchema(schema, base, ctx);
      if (kindOf(baseSchema) !== 'object') return;
      const current = (out ?? value)[base];
      if (current !== undefined && !isPlainObject(current)) return;
      const t = target();
      const group: JsonObject = isPlainObject(current) ? { ...current } : {};
      group[newOldValueKey(group, base)] = t[key];
      delete t[key];
      t[base] = group;
    });
  }

  return out ?? value;
};

/**
 * 文書の値を、表示するスキーマの版に合わせて置き直す（表示時）
 * 形の合う文書はそのまま（同じ参照）を返す
 * @param document 文書の値
 * @param schema 表示する版のスキーマ（文書の最上位のスキーマ）
 */
export const NormalizeVersionedValues = <T>(
  document: T,
  schema: VersionedSchema | undefined
): T => {
  if (!isPlainObject(document) || !schema) return document;
  return normalizeObject(document, schema, true, { root: schema }) as unknown as T;
};

/**
 * 保存前の仕上げ: 同じ項目の新しい欄に値が入っている旧値を取り除く
 */
const finalizeObject = (
  value: JsonObject,
  schema: VersionedSchema | undefined,
  ownName: string | undefined,
  ctx: SchemaContext
): JsonObject => {
  let out: JsonObject | undefined;
  const target = (): JsonObject => {
    if (!out) out = { ...value };
    return out;
  };

  Object.entries(value).forEach(([key, v]) => {
    const base = getBaseNameOfOldValueKey(key);
    if (base !== undefined) {
      const siblingSchema = getPropertySchema(schema, base, ctx);
      let filled = false;
      if (siblingSchema) {
        // 同じ階層に新しい欄がある（例: 2025 年版の POLE変異、または まとまり内の同名の欄）
        filled = !isEmptyVersionedValue(value[base]);
      } else if (ownName !== undefined && base === ownName) {
        // まとまりの中の旧値（例: 2026 年版の POLE変異 のまとまりの中）
        filled = hasNewValue(value, ownName, schema);
      }
      // 中身の無い旧値（× で消した後に項目名だけが残ったもの）も取り除く
      if (filled || isEmptyVersionedValue(v)) delete target()[key];
      return;
    }

    const propSchema = getPropertySchema(schema, key, ctx);
    const kind = kindOf(propSchema);
    if (kind === 'object' && isPlainObject(v)) {
      const inner = finalizeObject(v, propSchema, key, ctx);
      if (inner !== v) target()[key] = inner;
    } else if (kind === 'array' && Array.isArray(v) && propSchema) {
      const itemSchema = getItemSchema(propSchema, ctx);
      let changed = false;
      const items = v.map((item: unknown) => {
        if (!isPlainObject(item)) return item;
        const n = finalizeObject(item, itemSchema, undefined, ctx);
        if (n !== item) changed = true;
        return n;
      });
      if (changed) target()[key] = items;
    }
  });

  return out ?? value;
};

/**
 * 保存する文書の値を仕上げる
 * - 形の合わない値を旧値として置き直す（NormalizeVersionedValues と同じ）
 * - 同じ項目の新しい欄に値が入っている旧値を取り除く（新しい欄が空なら旧値は残す）
 * - 中身の無い旧値（× で消した後に項目名だけが残ったもの）を取り除く
 * 新しい欄が空の旧値が残る文書は、保存前の検証で保存を止める（IsSaveBlockingVersionMismatch）。
 * ここでは旧値を黙って消さない
 * 変更が無ければ、受け取ったものと同じ参照を返す
 * @param document 文書の値
 * @param schema 保存する版のスキーマ（文書の最上位のスキーマ）
 */
export const FinalizeVersionedValuesForSave = <T>(
  document: T,
  schema: VersionedSchema | undefined
): T => {
  const normalized = NormalizeVersionedValues(document, schema);
  if (!isPlainObject(normalized) || !schema) return normalized;
  return finalizeObject(normalized, schema, undefined, { root: schema }) as unknown as T;
};

/** 版と形の合わない値の種類 */
export type VersionMismatchKind =
  /** 切り替え前の値（「（切り替え前の値）」の項目）が残っている */
  | 'old_value'
  /** 文字列が 1 文字ずつに分解された形が残っている */
  | 'decomposed'
  /** 表示する版と形（まとまり／1 つの値）が合わない値が残っている */
  | 'shape_mismatch';

/** 版と形の合わない値の位置 */
export interface VersionMismatchFinding {
  /** 文書の中の位置（項目名の並び。配列の行は「n行目」） */
  path: string[];
  kind: VersionMismatchKind;
  /** その版のスキーマに、入力し直す欄があるか（無い場合は × で消すか日付を見直す） */
  hasCurrentField: boolean;
  /**
   * 切り替え前の値（old_value）について、同じ項目の新しい欄にすでに値があるか
   * 値がある場合は、保存時に新しい欄の値が正となり、切り替え前の値は取り除かれる（他の種類では常に false）
   */
  newValueFilled: boolean;
}

/**
 * 保存を止める対象か
 * 形の変わった項目の「切り替え前の値」が残り、同じ項目の新しい欄が空のもの（入力し直すか × で消すまで保存できない）。
 * 次のものは保存を止めない（保存時に旧値を取り除く、または読み取り専用のまま残す）
 * - 新しい欄にすでに値がある旧値（保存時に取り除く）
 * - 文書の版に入力し直す欄が無い値（新しい版に無い項目と同じ扱い。例: 2023 年版の文書に残る値）
 * - 置き直せない分解された形（同上）
 * 表示・編集中の値を置き直した結果（NormalizeVersionedValues 後）の判定結果に対して使う
 * @param finding 判定結果
 */
export const IsSaveBlockingVersionMismatch = (
  finding: VersionMismatchFinding
): boolean =>
  finding.kind === 'old_value' && finding.hasCurrentField && !finding.newValueFilled;

/**
 * 文書の中に、版と形の合わない値（切り替え前の値・分解された形・形の合わない値）が残っているかを調べる
 * 文書は変更しない
 * - 旧版にしかない項目（スキーマに無い項目）や、型は同じで選択肢だけ変わった項目は対象にしない
 * - 分解された形は、スキーマに無い位置にあっても対象にする（古い版の文書に残った場合を含む）
 * @param document 文書の値
 * @param schema 文書の版のスキーマ（文書の最上位のスキーマ）。不明な場合は undefined（形の比較を省く）
 * @returns 見つかった位置の一覧（無ければ空）
 */
export const FindVersionMismatchValues = (
  document: unknown,
  schema: VersionedSchema | undefined
): VersionMismatchFinding[] => {
  const findings: VersionMismatchFinding[] = [];
  if (!isPlainObject(document)) return findings;
  const ctx: SchemaContext = { root: schema };

  const walk = (
    value: JsonObject,
    node: VersionedSchema | undefined,
    path: string[],
    ownName: string | undefined,
    isDocumentRoot: boolean
  ): void => {
    Object.entries(value).forEach(([key, v]) => {
      if (isDocumentRoot && key === JESGO_ERROR_KEY) return;
      // 値の無い項目は保存されないため対象にしない
      // （× で消した直後は、項目名が残ったまま値が undefined になっている）
      if (v === undefined) return;

      const base = getBaseNameOfOldValueKey(key);
      if (base !== undefined) {
        // 中身の無い旧値（まとまりの中の欄をすべて × で消したものなど）は残っていないものとみなす
        if (isEmptyVersionedValue(v)) return;
        const siblingSchema = getPropertySchema(node, base, ctx);
        const isOwnGroup = ownName === base && definedKeysOf(node).length > 0;
        findings.push({
          path: [...path, base],
          kind: 'old_value',
          // まとまりの中の旧値（例: POLE変異 > POLE変異（切り替え前の値））は、まとまりの欄に入力し直す
          hasCurrentField: siblingSchema !== undefined || isOwnGroup,
          // 保存時の仕上げ（finalizeObject）と同じ基準で、新しい欄に値があるかを見る
          newValueFilled:
            siblingSchema !== undefined
              ? !isEmptyVersionedValue(value[base])
              : isOwnGroup && hasNewValue(value, base, node),
        });
        return;
      }

      const propSchema = getPropertySchema(node, key, ctx);
      const kind = kindOf(propSchema);
      const childPath = [...path, key];

      if (isPlainObject(v)) {
        if (!isDocumentRoot && restoreDecomposedString(v, definedKeysOf(propSchema))) {
          findings.push({
            path: childPath,
            kind: 'decomposed',
            hasCurrentField: kind !== undefined,
            newValueFilled: false,
          });
          return;
        }
        if (!isDocumentRoot && kind === 'primitive') {
          findings.push({ path: childPath, kind: 'shape_mismatch', hasCurrentField: true, newValueFilled: false });
          return;
        }
        walk(v, kind === 'object' ? propSchema : undefined, childPath, key, false);
        return;
      }

      if (Array.isArray(v)) {
        if (!isDocumentRoot && kind === 'primitive') {
          findings.push({ path: childPath, kind: 'shape_mismatch', hasCurrentField: true, newValueFilled: false });
          return;
        }
        const itemSchema =
          kind === 'array' && propSchema ? getItemSchema(propSchema, ctx) : undefined;
        v.forEach((item: unknown, index: number) => {
          if (isPlainObject(item)) {
            walk(
              item,
              kindOf(itemSchema) === 'object' ? itemSchema : undefined,
              [...childPath, `${index + 1}行目`],
              undefined,
              false
            );
          }
        });
        return;
      }

      if (!isDocumentRoot && isPrimitive(v) && v !== '' && kind === 'object') {
        findings.push({ path: childPath, kind: 'shape_mismatch', hasCurrentField: true, newValueFilled: false });
      }
    });
  };

  walk(document, schema, [], undefined, true);
  return findings;
};

/**
 * 文書に、版と形の合わない値が残っているか（患者リストの「エラーあり」の判定に使う）
 * @param document 文書の値
 * @param schema 文書の版のスキーマ。不明な場合は undefined
 */
export const HasVersionMismatchValue = (
  document: unknown,
  schema: VersionedSchema | undefined
): boolean => FindVersionMismatchValues(document, schema).length > 0;

const findingKey = (finding: VersionMismatchFinding): string =>
  JSON.stringify([finding.kind, finding.path]);

/**
 * 症例登録画面のエラー一覧に出す案内の対象を求める
 * 患者リストの「エラーあり」（HasVersionMismatchValue。保存されている値で判定）と、開いた直後の案内の有無を一致させる。
 * - 表示している値（置き直した値）に残る、切り替え前の値・分解された形を対象にする
 * - ただし、新しい欄に値がある切り替え前の値（保存時に取り除かれるもの）は、
 *   開いた時点の値（baseline）にすでにあったものだけを対象にする。
 *   開いた後に利用者が新しい欄へ入力した項目は、入力した時点で案内を消す
 * 開いた直後（current と baseline が同じ）は、HasVersionMismatchValue(baseline) が真のとき、かつそのときだけ 1 件以上を返す
 * @param current 表示・編集中の文書の値
 * @param baseline 開いた時点（保存されている）の文書の値。新しい文書などで無い場合は undefined
 * @param schema 文書の版のスキーマ
 */
export const FindVersionMismatchGuides = (
  current: unknown,
  baseline: unknown,
  schema: VersionedSchema | undefined
): VersionMismatchFinding[] => {
  const findings = FindVersionMismatchValues(
    NormalizeVersionedValues(current, schema),
    schema
  );
  const baselineFilled = new Set(
    FindVersionMismatchValues(NormalizeVersionedValues(baseline, schema), schema)
      .filter((f) => f.kind === 'old_value' && f.newValueFilled)
      .map((f) => findingKey(f))
  );
  return findings.filter(
    (f) =>
      !(f.kind === 'old_value' && f.newValueFilled) ||
      baselineFilled.has(findingKey(f))
  );
};
