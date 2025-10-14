const script_info = {
  plugin_name: "患者データ一括取込(子宮体がん)_2024年様式",
  plugin_version: "1.0",
  all_patient: true,
  update_db: true,
  target_schema_id_string: "",
  attach_patient_info: true,
  show_upload_dialog: true,
  filter_schema_query: "",
  explain: "子宮体がん(2024)のCSVを一括インポートします",
  newdata: true,
  plugin_group_id: 1,
};
export async function init() {
  return script_info;
}

export async function main() {}

const CANCER_TYPE = '子宮体がん';

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

// [項目定義]子宮体がん
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
  { colName: "病期診断_治療施行状況"                            , jsonpath: "/治療施行状況"},
  { colName: "病期診断_FIGO"                                , jsonpath: "/FIGO"},

  { colName: "病期診断_cTNM_T"                              , jsonpath: "/cTNM/T/T"},
  { colName: "病期診断_cTNM_N_画像診断の計測手段"           , jsonpath: "/cTNM/N/画像診断の計測手段"},
  { colName: "病期診断_cTNM_N_骨盤リンパ節の所見"           , jsonpath: "/cTNM/N/NP"},
  { colName: "病期診断_cTNM_N_傍大動脈リンパ節の所見"       , jsonpath: "/cTNM/N/NA"},
  { colName: "病期診断_cTNM_M"                              , jsonpath: "/cTNM/M/M"},
  { colName: "病期診断_cTNM_M_遠隔転移部位"                 , jsonpath: "/cTNM/M/遠隔転移部位", type: "array"},

  { colName: "病期診断_pTNM_T"                              , jsonpath: "/pTNM/T/T"},
  { colName: "病期診断_pTNM_T_付属器転移_転移状況"          , jsonpath: "/pTNM/T/付属器転移/転移状況"},
  { colName: "病期診断_pTNM_T_付属器転移_備考"              , jsonpath: "/pTNM/T/付属器転移/備考"},
  { colName: "病期診断_pTNM_T_子宮漿膜浸潤"                 , jsonpath: "/pTNM/T/子宮漿膜浸潤"},
  { colName: "病期診断_pTNM_T_骨盤腹膜播種"                 , jsonpath: "/pTNM/T/骨盤腹膜播種"},
  { colName: "病期診断_pTNM_T_子宮傍組織浸潤"               , jsonpath: "/pTNM/T/子宮傍組織浸潤"},
  { colName: "病期診断_pTNM_T_腟壁浸潤"                     , jsonpath: "/pTNM/T/腟壁浸潤"},
  { colName: "病期診断_pTNM_T_腹腔内播種"                   , jsonpath: "/pTNM/T/腹腔内播種"},
  { colName: "病期診断_pTNM_T_膀胱または腸管粘膜浸潤"       , jsonpath: "/pTNM/T/膀胱または腸管粘膜浸潤"},
  { colName: "病期診断_pTNM_N_骨盤リンパ節に対する処置"     , jsonpath: "/pTNM/N/RP"},
  { colName: "病期診断_pTNM_N_骨盤リンパ節の所見"           , jsonpath: "/pTNM/N/RPX"},
  { colName: "病期診断_pTNM_N_傍大動脈リンパ節に対する処置" , jsonpath: "/pTNM/N/RA"},
  { colName: "病期診断_pTNM_N_傍大動脈リンパ節の所見"       , jsonpath: "/pTNM/N/RAX"},
  { colName: "病期診断_pTNM_M"                              , jsonpath: "/pTNM/M/M"},
  { colName: "病期診断_pTNM_M_遠隔転移部位"                 , jsonpath: "/pTNM/M/遠隔転移部位", type: "array"},

  { colName: "病期診断_ypTNM_T"                             , jsonpath: "/ypTNM/T/T"},
  { colName: "病期診断_ypTNM_N_骨盤リンパ節に対する処置"    , jsonpath: "/ypTNM/N/RP"},
  { colName: "病期診断_ypTNM_N_骨盤リンパ節の所見"          , jsonpath: "/ypTNM/N/RPX"},
  { colName: "病期診断_ypTNM_N_傍大動脈リンパ節に対する処置", jsonpath: "/ypTNM/N/RA"},
  { colName: "病期診断_ypTNM_N_傍大動脈リンパ節の所見"      , jsonpath: "/ypTNM/N/RAX"},
  { colName: "病期診断_ypTNM_M"                             , jsonpath: "/ypTNM/M/M"},
  { colName: "病期診断_ypTNM_M_遠隔転移部位"                , jsonpath: "/ypTNM/M/遠隔転移部位", type: "array"},
];

// [項目定義]診断所見
const findingsItems = [
  { colName: "診断所見_腹水細胞診"             , jsonpath: "/腹水細胞診"},
  { colName: "診断所見_筋層浸潤の有無_所見"    , jsonpath: "/筋層浸潤/所見"},
  { colName: "診断所見_筋層浸潤の有無_診断方法", jsonpath: "/筋層浸潤/診断方法"},
];

// [項目定義]組織診断
const pathologyItems = [
  { colName: "組織診断_組織型"                           , jsonpath: "/組織型"},
  { colName: "組織診断_その他組織型"                     , jsonpath: "/その他組織型"},
  { colName: "組織診断_組織学的異型度"                   , jsonpath: "/組織学的異型度"},
  { colName: "組織診断_脈管侵襲"                         , jsonpath: "/脈管侵襲"},
  { colName: "組織診断_分子遺伝学的プロファイル_POLE変異", jsonpath: "/分子遺伝学的プロファイル/POLE変異"},
  { colName: "組織診断_分子遺伝学的プロファイル_MMR_MSI" , jsonpath: "/分子遺伝学的プロファイル/MMR~1MSI"},
  { colName: "組織診断_分子遺伝学的プロファイル_p53"     , jsonpath: "/分子遺伝学的プロファイル/p53"},
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
      // 子宮体がん
      if (row[columnRelation["がん種"]] === CANCER_TYPE) {
        updateObject.schema_id = "/schema/EM/root";
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
        staging.schema_id = "/schema/EM/staging";
        const stagingTarget = {};
        stagingItems.forEach(item => {

          // TMN M分類 遠隔転移部位の特殊処理
          if(item.colName.endsWith("遠隔転移部位") && item.type === "array") {

            // 「領域外リンパ節転移|その他@その他具体的部位」のような文字列から更新用のオブジェクトを生成する

            const value = row[columnRelation[item.colName]];
            if(value && value !== "") {
              const objArray = value.split("|").map(itemValue => { 
                let item1 = itemValue;
                let item2 = "";
                if(itemValue.includes("@")) {
                  const splItem = itemValue.split("@");
                  item1 = splItem[0] ? splItem[0] : "";
                  item2 = splItem[1] ? splItem[1] : "";
                }

                const retObj = {};
                if(item1 && item1 !== "") {
                  retObj["部位"] = item1;
                }
                if(item2 && item2 !== "") {
                  retObj["具体的部位"] = item2;
                }

                return retObj;

               });
              addItem(stagingTarget, item.jsonpath, objArray);
            }
          } else {
            addItem(stagingTarget, item.jsonpath, row[columnRelation[item.colName]], item.type);
          }
        });

        // targetがあれば追加する
        if (Object.entries(stagingTarget).length > 0) {
          staging.target = stagingTarget;
          child_documents.push(staging);
        }
        // ---------------------------------------

        // 診断所見 -------------------------------
        const findings = {};
        findings.schema_id = "/schema/EM/findings";
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
        pathology.schema_id = "/schema/EM/pathology";
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

  if(updateList.length === 0) {
    alert(`ファイルから更新対象の患者データが読み込めませんでした。`);
    return;
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
