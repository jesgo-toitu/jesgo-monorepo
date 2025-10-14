const script_info = {
  plugin_name: "患者データ一括取込(子宮頸がん)_2024年様式",
  plugin_version: "1.0",
  all_patient: true,
  update_db: true,
  target_schema_id_string: "",
  attach_patient_info: true,
  show_upload_dialog: true,
  filter_schema_query: "",
  explain: "子宮頸がん(2024)のCSVを一括インポートします",
  newdata: true,
  plugin_group_id: 1,
};
export async function init() {
  return script_info;
}

export async function main() {}

const CANCER_TYPE = '子宮頸がん';

/*
  スキーマごとに項目定義
  colName: CSVの列名
  jsonpath: ドキュメント更新時のJSONパス
  type: 項目のデータ種別。以下を設定する想定
    date: 日付項目
    number: 数値項目
    array: 配列。配列の場合、"|"をセパレータとして扱う(例："A|B|C"の場合は3つの項目がある)
    上記以外: 文字列項目
*/

// [項目定義]子宮頸がん
const ccRootItems = [
  { colName: "初回治療開始日", jsonpath: "/初回治療開始日", type: "date"},
  { colName: "診断日",         jsonpath: "/診断日",         type: "date"},
  { colName: "腫瘍登録対象",   jsonpath: "/腫瘍登録対象"},
  { colName: "腫瘍登録番号",   jsonpath: "/腫瘍登録番号"},
  { colName: "予後調査_3年",   jsonpath: "/予後調査/3年",   type: "date"},
  { colName: "予後調査_5年",   jsonpath: "/予後調査/5年",   type: "date"},
];

// [項目定義]病期診断
const stagingItems = [
  { colName: "病期診断_治療施行状況"                        , jsonpath: "/治療施行状況"},
  { colName: "病期診断_FIGO"                                , jsonpath: "/FIGO"},
  { colName: "病期診断_cTNM_T"                              , jsonpath: "/cTNM/T/T"},
  { colName: "病期診断_cTNM_T_T1a期詳細入力"                , jsonpath: "/cTNM/T/T1a期 詳細入力"},
  { colName: "病期診断_cTNM_N"                              , jsonpath: "/cTNM/N/N"},
  { colName: "病期診断_cTNM_M_遠隔転移の評価"               , jsonpath: "/cTNM/M/M"},
  { colName: "病期診断_cTNM_M_遠隔転移部位"                 , jsonpath: "/cTNM/M/L", type: "array"},
  { colName: "病期診断_pTNM_T"                              , jsonpath: "/pTNM/T/T"},
  { colName: "病期診断_pTNM_T_T1a期詳細入力"                , jsonpath: "/pTNM/T/T1a期 詳細入力"},
  { colName: "病期診断_pTNM_T_T1a期腫瘍の厚さ"              , jsonpath: "/pTNM/T/T1a期 腫瘍の厚さ"},
  { colName: "病期診断_pTNM_N_骨盤リンパ節に対する処置"     , jsonpath: "/pTNM/N/RP"},
  { colName: "病期診断_pTNM_N_骨盤リンパ節の所見"           , jsonpath: "/pTNM/N/RPX"},
  { colName: "病期診断_pTNM_N_傍大動脈リンパ節に対する処置" , jsonpath: "/pTNM/N/RA"},
  { colName: "病期診断_pTNM_N_傍大動脈リンパ節の所見"       , jsonpath: "/pTNM/N/RAX"},
  { colName: "病期診断_pTNM_M"                              , jsonpath: "/pTNM/M/M"},
  { colName: "病期診断_ypTNM_T"                             , jsonpath: "/ypTNM/T/T"},
  { colName: "病期診断_ypTNM_T_T1a期詳細入力"               , jsonpath: "/ypTNM/T/T1a期 詳細入力"},
  { colName: "病期診断_ypTNM_T_T1a期腫瘍の厚さ"             , jsonpath: "/ypTNM/T/T1a期 腫瘍の厚さ"},
  { colName: "病期診断_ypTNM_N_骨盤リンパ節に対する処置"    , jsonpath: "/ypTNM/N/RP"},
  { colName: "病期診断_ypTNM_N_骨盤リンパ節の所見"          , jsonpath: "/ypTNM/N/RPX"},
  { colName: "病期診断_ypTNM_N_傍大動脈リンパ節に対する処置", jsonpath: "/ypTNM/N/RA"},
  { colName: "病期診断_ypTNM_N_傍大動脈リンパ節の所見"      , jsonpath: "/ypTNM/N/RAX"},
  { colName: "病期診断_ypTNM_M"                             , jsonpath: "/ypTNM/M/M"},
];

// [項目定義]診断所見
const findingsItems = [
  { colName: "診断所見_腫瘍最大腫瘍径_所見"            , jsonpath: "/腫瘍最大腫瘍径/所見"},
  { colName: "診断所見_腫瘍最大腫瘍径_診断方法"        , jsonpath: "/腫瘍最大腫瘍径/診断方法"},
  { colName: "診断所見_基靭帯浸潤_所見"                , jsonpath: "/基靭帯浸潤/所見"},
  { colName: "診断所見_基靭帯浸潤_診断方法"            , jsonpath: "/基靭帯浸潤/診断方法"},
  { colName: "診断所見_腟壁浸潤_所見"                  , jsonpath: "/腟壁浸潤/所見"},
  { colName: "診断所見_腟壁浸潤_診断方法"              , jsonpath: "/腟壁浸潤/診断方法"},
  { colName: "診断所見_膀胱粘膜浸潤_所見"              , jsonpath: "/膀胱粘膜浸潤/所見"},
  { colName: "診断所見_膀胱粘膜浸潤_診断方法"          , jsonpath: "/膀胱粘膜浸潤/診断方法"},
  { colName: "診断所見_直腸粘膜浸潤_所見"              , jsonpath: "/直腸粘膜浸潤/所見"},
  { colName: "診断所見_直腸粘膜浸潤_診断方法"          , jsonpath: "/直腸粘膜浸潤/診断方法"},
  { colName: "診断所見_骨盤リンパ節転移_所見"          , jsonpath: "/骨盤リンパ節転移/所見"},
  { colName: "診断所見_骨盤リンパ節転移_診断方法"      , jsonpath: "/骨盤リンパ節転移/診断方法"},
  { colName: "診断所見_傍大動脈リンパ節転移_所見"      , jsonpath: "/傍大動脈リンパ節転移/所見"},
  { colName: "診断所見_傍大動脈リンパ節転移_診断方法"  , jsonpath: "/傍大動脈リンパ節転移/診断方法"},
  { colName: "診断所見_その他のリンパ節転移_所見"      , jsonpath: "/その他のリンパ節転移/所見"},
  { colName: "診断所見_その他のリンパ節転移_診断方法"  , jsonpath: "/その他のリンパ節転移/診断方法"},
  { colName: "診断所見_リンパ節以外の遠隔転移_所見"    , jsonpath: "/リンパ節以外の遠隔転移/所見"},
  { colName: "診断所見_リンパ節以外の遠隔転移_診断方法", jsonpath: "/リンパ節以外の遠隔転移/診断方法"},
  { colName: "診断所見_術後再発リスク"                 , jsonpath: "/術後再発リスク"},
];

// [項目定義]組織診断
const pathologyItems = [
  { colName: "組織診断_組織型"        , jsonpath: "/組織型"},
  { colName: "組織診断_扁平上皮癌詳細"  , jsonpath: "/扁平上皮癌 詳細" },
  { colName: "組織診断_腺癌詳細"      , jsonpath: "/腺癌 詳細" },
  { colName: "組織診断_その他組織型"  , jsonpath: "/その他組織型"},
];

// [項目定義]初回治療
const initialTreatmentItems = [
  { colName: "初回治療_治療サマリー"  , jsonpath: "/治療サマリー"},
];

// CSVをパース
const parseCsv = (csvStr, delimiter) => {
  var rowRegex = /(?:(?:"[^"]*")*[^\r\n"]*)+/g,
    colRegex = new RegExp('(?:(?:"[^"]*")*[^' + delimiter + '"]*)+', "g"),
    rows = [],
    row,
    cells,
    cell,
    rowMaches,
    colMaches;
  //行を切り出す
  while ((rowMaches = rowRegex.exec(csvStr)) !== null) {
    if (rowMaches[0] !== "") {
      cells = [];
      row = rowMaches[0];
      //セルを切り出す
      while ((colMaches = colRegex.exec(row)) !== null) {
        cell = colMaches[0].replace(/^\s+|\s+$/g, "");
        if (cell.charAt(0) == '"' && cell.charAt(cell.length - 1) == '"') {
          cell = cell.slice(1, -1);
        }
        cell = cell.replace(/""/g, '"');
        cells.push(cell);
        colRegex.lastIndex++;
      }
      rows.push(cells);
    }
    rowRegex.lastIndex++;
  }
  return rows;
}

const formatDateStr = (dtStr, separator = "-") => {
  if (!dtStr) return '';
  try {
    const dateObj = new Date(dtStr);
    if(Number.isNaN(dateObj.getTime())) { return ""; }
    const y = dateObj.getFullYear();
    const m = `00${dateObj.getMonth() + 1}`.slice(-2);
    const d = `00${dateObj.getDate()}`.slice(-2);
    return `${y}${separator}${m}${separator}${d}`;
  } catch {
    return '';
  }
};

const addItem = (target, itemPath, itemValue, valueType) => {
  // 値があればtargetにセットする
  if (itemValue == null || itemValue == "") {
    return;
  }

  // 配列の場合は"|"で文字列分割して取り出す
  if (valueType === "array") {
    const arrayValues = itemValue.split("|");
    target[itemPath] = arrayValues;
  } else if (valueType === "date") {
    // 日付はyyyy-MM-ddへ変換する
    target[itemPath] = formatDateStr(itemValue);
  } else {
    target[itemPath] = itemValue;
  }
};

export async function importDocument(csvRawText, func) {
  if (!csvRawText || csvRawText == null || csvRawText === "") {
    return undefined;
  }

  const updateList = [];

  const rows = parseCsv(csvRawText, ",");

  if (rows.length > 1) {
    const colCount = rows[0].length;
    if (rows.some((p) => p.length !== colCount)) {
      // return [{ success: false, errorMsg: "列数が異なる行があります。" }];
      alert(`不正なCSVです。列数が異なる行があります。`);
      return;
    }

    const headerRow = rows[0];
    // 列名とインデックスの紐づけ
    const columnRelation = {};
    for (let i = 0; i < colCount; i += 1) {
      columnRelation[headerRow[i]] = i;
    }

    rows.shift(); // 列名の行削除
    rows.forEach((row) => {
      const updateObject = {};

      // 患者情報の作成
      const patient_info = {
        his_id: row[columnRelation["患者ID"]],
        name: row[columnRelation["患者氏名"]],
        date_of_birth: row[columnRelation["生年月日"]],
      };
      
      // 必須チェック
      if(patient_info.his_id === "" || patient_info.name === "" || patient_info.date_of_birth === "") {
        return;
      }

      updateObject.patient_info = patient_info;

      // ドキュメントの作成
      // 子宮頸がん
      if (row[columnRelation["がん種"]] === CANCER_TYPE) {
        updateObject.schema_id = "/schema/CC/root";
        const target = {};
        target["/がん種"] = CANCER_TYPE;

        ccRootItems.forEach(item => {
          addItem(target, item.jsonpath, row[columnRelation[item.colName]], item.type);
        })
        updateObject.target = target;

        // サブスキーマの項目
        const child_documents = [];
        // 病期診断 -------------------------------
        const staging = {};
        staging.schema_id = "/schema/CC/staging";
        const stagingTarget = {};
        stagingItems.forEach(item => {
          addItem(stagingTarget, item.jsonpath, row[columnRelation[item.colName]], item.type);
        });

        // targetがあれば追加する
        if (Object.entries(stagingTarget).length > 0) {
          staging.target = stagingTarget;
          child_documents.push(staging);
        }
        // ---------------------------------------

        // 診断所見 -------------------------------
        const findings = {};
        findings.schema_id = "/schema/CC/findings";
        const findingsTarget = {};
        findingsItems.forEach(item => {
          addItem(findingsTarget, item.jsonpath, row[columnRelation[item.colName]], item.type);
        });

        // targetがあれば追加する
        if (Object.entries(findingsTarget).length > 0) {
          findings.target = findingsTarget;
          child_documents.push(findings);
        }
        // ---------------------------------------

        // 組織診断 -------------------------------
        const pathology = {};
        pathology.schema_id = "/schema/CC/pathology";
        const pathologyTarget = {};
        pathologyItems.forEach(item => {
          addItem(pathologyTarget, item.jsonpath, row[columnRelation[item.colName]], item.type);
        });

        // targetがあれば追加する
        if (Object.entries(pathologyTarget).length > 0) {
          pathology.target = pathologyTarget;
          child_documents.push(pathology);
        }
        // ---------------------------------------

        // 初回治療 -------------------------------
        const initialTreatment = {};
        initialTreatment.schema_id = "/schema/treatment/initial_treatment";
        const initialTreatmentTarget = {};
        initialTreatmentItems.forEach(item => {
          addItem(initialTreatmentTarget, item.jsonpath, row[columnRelation[item.colName]], item.type);
        });

        // targetがあれば追加する
        if (Object.entries(initialTreatmentTarget).length > 0) {
          initialTreatment.target = initialTreatmentTarget;
          child_documents.push(initialTreatment);
        }
        // ---------------------------------------

        if (child_documents.length > 0) {
          updateObject.child_documents = child_documents;
        }
      }

      updateList.push(updateObject);
    });
  }
  const insertResult = await func(updateList);
  
  if (insertResult) {
    const successCount = insertResult.filter((p) => p.success).length;
    const failedCount = insertResult.filter((p) => !p.success).length;

    alert(
      `インポートが完了しました。\n成功：${successCount}件　失敗：${failedCount}件`
    );

  }
}
