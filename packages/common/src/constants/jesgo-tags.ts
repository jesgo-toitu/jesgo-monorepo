/**
 * JESGOタグの定義
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Const {
  export const JESGO_TAG = {
    PREFIX: 'jesgo:tag',
    CANCER_MAJOR: 'cancer_major',
    CANCER_MINOR: 'cancer_minor',
    FIGO: 'figo',
    INITIAL_TREATMENT_DATE: 'initial_treatment_date',
    DIAGNOSIS_DATE: 'diagnosis_date',
    REGISTRABILITY: 'registrability',
    REGISTRATION_NUMBER: 'registration_number',
    RECURRENCE: 'recurrence',
    TREATMENT_SURGERY: 'treatment_surgery',
    SURGIGAL_COMPLICATIONS: 'has_complications',
    TREATMENT_CHEMO: 'treatment_chemo',
    TREATMENT_RADIO: 'treatment_radio',
    TREATMENT_SUPPORTIVECARE: 'treatment_supportivecare',
    THREE_YEAR_PROGNOSIS: 'three_year_prognosis',
    FIVE_YEAR_PROGNOSIS: 'five_year_prognosis',
  } as const;

  /**
   * UiSchemaプロパティ
   */
  export const UI_WIDGET = {
    ORDER: 'ui:order',
    WIDGET: 'ui:widget',
    OPTIONS: 'ui:options',
    AUTOCOMPLETE: 'ui:autocomplete',
    FIELD_TEMPLATE: 'ui:FieldTemplate',
    OBJECT_FIELD_TEMPLATE: 'ui:ObjectFieldTemplate',
    CLASS: 'classNames',
  } as const;

  /**
   * 拡張ボキャブラリー
   */
  export const EX_VOCABULARY = {
    REQUIRED: 'jesgo:required',
    UNIQUE: 'jesgo:unique',
    VALIDATION_ALERT: 'jesgo:validationalert',
    JESGO_ERROR: 'jesgo:error',
    NOT_EXIST_PROP: 'jesgo:notExistProperty',
    UI_TEXTAREA: 'jesgo:ui:textarea',
    UI_LISTTYPE: 'jesgo:ui:listtype',
    UI_SUBSCHEMA_STYLE: 'jesgo:ui:subschemastyle',
    UI_VISIBLE_WHEN: 'jesgo:ui:visibleWhen',
    UI_HIDDEN: 'jesgo:ui:hidden',
  } as const;

  /**
   * jesgo:ui:listtypeに使用できる項目定義
   */
  export const JESGO_UI_LISTTYPE = {
    LIST: 'list',
    COMBO: 'combo',
    SUGGEST_LIST: 'suggestlist',
    SUGGEST_COMBO: 'suggestcombo',
    BUTTONS: 'buttons',
  } as const;

  /**
   * JSONSchema7のKey
   */
  export const JSONSchema7Keys = {
    DESCRIPTION: 'description',
    REF: '$ref',
    DEFS: '$defs',
    ITEMS: 'items',
    TYPE: 'type',
    PROP: 'properties',
    FORMAT: 'format',
    ONEOF: 'oneOf',
    IF: 'if',
    THEN: 'then',
    ELSE: 'else',
    PATTERN: 'pattern',
  } as const;

  /**
   * JSONSchema7TypesのType
   */
  export const JSONSchema7Types = {
    ARRAY: 'array',
    OBJECT: 'object',
    STRING: 'string',
    INTEGER: 'integer',
    NUMBER: 'number',
  } as const;

  /**
   * jesgo:requiredの種類
   * ※これ以外は「その他」として扱われる
   */
  export const JesgoRequiredTypes = {
    JSOG: 'JSOG',
    JSGOE: 'JSGOE',
  };

  /**
   * 必須項目のラベル横に出るマーク
   */
  export const REQUIRED_FIELD_SYMBOL = '*';

  /**
   * 日付入力コントロールの最小値
   */
  export const INPUT_DATE_MIN = '1900-01-01';

  /**
   * プラグイン実行時のタイムアウト秒
   * 初期値：15(秒)*60(分/秒)=>15分(900秒)
   */
  export const PLUGIN_TIMEOUT_SEC = 900;
}

/**
 * JESGOタグ文字列を生成する
 * @param tag タグ名
 * @returns JESGOタグ文字列
 */
export const jesgo_tagging = (tag: string): string => {
  return `"${Const.JESGO_TAG.PREFIX}":"${tag}"`;
};

