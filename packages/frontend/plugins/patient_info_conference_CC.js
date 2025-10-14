const script_info = {
    plugin_name: '頸癌カンファ',
    plugin_version: '1.0',
    all_patient: false,
    update_db: false,
    attach_patient_info: true,
    show_upload_dialog: false,
    target_schema_id_string: "",
    filter_schema_query: '',
    explain: '子宮頸がんのカンファをテキスト形式で出力します',
}
export async function init() {
    return script_info;
}

/**
 * 対象がんに合わせて変える
 */
const TARGET_TYPE_NAME = "子宮頸がん";
const subWindowName = "subWindowConferenceCC";

/**
 * 子画面を表示
 * @param {string} dispText 表示テキスト
 */
function openWindow(dispText) {
    // 子画面のサイズ
    const height = 600;
    const width = 800;
    const subWindowTitle = `カンファレンス（${TARGET_TYPE_NAME}）`;

    // 新しいウィンドウを開く
    // 同名のウィンドウがあればそちらが使われる
    var wTop = window.screenTop + (window.innerHeight / 2) - (height / 2);
    var wLeft = window.screenLeft + (window.innerWidth / 2) - (width / 2);
    var popupWindow = window.open('', subWindowName,
        `popup,height=${height},width=${width},top=${wTop},left=${wLeft}`);
    popupWindow.name = subWindowName;

    // header
    var newWindowDoc = popupWindow.document;
    newWindowDoc.head.innerHTML =
        `<meta charset="utf-8">
        <link rel="stylesheet" href="./bootstrap-dist/css/bootstrap.min.css">
        <link rel="stylesheet" href="./bootstrap-dist/css/bootstrap-theme.min.css">
        <title>${subWindowTitle}</title>`;

    // body
    newWindowDoc.body.innerHTML =
        `<div id="div_textarea" class="modal-header" style="display: flex; justify-content:  flex-start; height:55px">
            <h3 style="margin:0;">${subWindowTitle}</h3>
            <div style="display: flex; align-items: center; margin:0px 0px 0px 10px;">
                <button onclick="copyText()" type="button" class="btn btn-default">テキストをコピー</button>
            </div>
        </div>
        <div class="modal-body">
            <textarea id="summaryTextarea" rows="10" cols="40" 
            style="height: calc(100vh - 55px - 30px); width: 100%; resize:none">${dispText}</textarea>
        </div>`;

    // script
    var scriptElement = newWindowDoc.createElement(`script`);
    scriptElement.innerHTML = (`
        function copyText() {
            // テキストボックスの値を取得
            var textboxValue = document.getElementById('summaryTextarea').value;

            // テキストボックスの値をクリップボードにコピー
            navigator.clipboard.writeText(textboxValue).then(function() {
                alert('テキストがコピーされました');
            }).catch(function(err) {
                console.error('テキストのコピーに失敗しました', err);
            });
        }
    `)
    newWindowDoc.body.appendChild(scriptElement);
    popupWindow.focus();
}

/**
 * 年齢計算(現在日時点)
 * @param {string} birthday - 生年月日
 * @returns {string} - 年齢
 */
function calcAge(birthday) {
    if (!birthday) return '';

    // 生年月日
    const birthdayDateObj = new Date(birthday);
    const birthNum =
        birthdayDateObj.getFullYear() * 10000 +
        (birthdayDateObj.getMonth() + 1) * 100 +
        birthdayDateObj.getDate();

    // 現在日
    const nowDate = new Date();
    const nowNum =
        nowDate.getFullYear() * 10000 +
        (nowDate.getMonth() + 1) * 100 +
        nowDate.getDate();

    return Math.floor((nowNum - birthNum) / 10000).toString();
};

/**
 * 文字列変換
 * @param {string} str - 変換する文字列
 * @returns {string} - paramが空なら空文字を返す。それ以外はそのまま。
 */
function convertString(str) {
    return str == null ? "" : str;
}

/**
 * JSONオブジェクト変換
 * @param {*} targetValue  - 変換するJSONオブジェクト
 * @returns  - paramが空なら空オブジェクトを返す。それ以外はそのまま。
 */
function convertJsonObj(targetValue) {
    return targetValue == null ? {} : targetValue;
}

/**
 * 患者台帳　値取得
 * @param {json} root 
 * @returns 
 */
function setRootValues(root) {
    var rootValues = {
        staging: {},
        stagingTNM: {},
        preoperativeTNM:{},
        pathology: {},
        findings: {},
        tumorMaxDiameter:{},
        genes: {},
        pathlogyReportList:{},
    }

    // 病期診断
    rootValues.staging = convertJsonObj(root["病期診断"]);
    rootValues.preoperativeTNM = convertJsonObj(rootValues.staging["cTNM"]);
    if (rootValues.staging["治療施行状況"] === "初回手術施行例") {
        rootValues.stagingTNM = convertJsonObj(rootValues.staging["pTNM"])
    } else if (rootValues.staging["治療施行状況"] === "術前治療後に手術施行") {
        rootValues.stagingTNM = convertJsonObj(rootValues.staging["ypTNM"])
    }

    // 初回治療
    var initialTreatment = convertJsonObj(root["初回治療"]);
    rootValues.operations = convertJsonObj(initialTreatment["手術療法"])

    // 組織診断
    rootValues.pathology = convertJsonObj(root["組織診断"]);
    rootValues.pathlogyReportList = convertJsonObj(rootValues.pathology["病理診断レポート"]);

    // 診断所見
    rootValues.findings = convertJsonObj(root["診断所見"]);
    rootValues.genes = convertJsonObj(rootValues.findings["腫瘍遺伝子検査"])
    rootValues.tumorMaxDiameter = convertJsonObj(rootValues.findings["腫瘍最大腫瘍径"])

    return rootValues;
}

/**
 * 条件のテキストであれば追加文言も合わせて出力する
 * @param {string} mainText 
 * @param {string} additional 
 * @param {string[]} conditions 
 * @returns 
 */
function getTextWithAdditional(mainText, additional, conditions) {
    if (mainText) {
        if (Array.isArray(conditions) && conditions.includes(mainText)) {
            return `${mainText}(${convertString(additional)})`;
        } else {
            return convertString(mainText);
        }
    }
}

export async function main(docObj, func) {
    var output = [];
    var targetData = await func(docObj);
    var caseInfo = {};
    var rootValues = {
        staging: {},
        stagingTNM: {},
        preoperativeTNM: {},
        pathology: {},
        findings: {},
        genes: {},
        tumorMaxDiameter: {},
        pathlogyReportList: {},
    }


    // formDataの中身を掘っていく
    var existTarget = false;
    if (targetData) {
        var targetDataJson = JSON.parse(targetData);
        // all_patientがfalseなのでtargetDataは必ず 0 or 1件
        if (targetDataJson && targetDataJson.length > 0) {
            caseInfo = targetDataJson[0];
            if (caseInfo) {
                caseInfo.documentList.forEach((docList) => {
                    if (docList) {
                        // 患者台帳
                        var root = docList["患者台帳"];
                        // 対象のがん
                        if (root) {
                            if (Array.isArray(root) && root.length > 0) {
                                root.forEach((value) => {
                                    if (value && value["がん種"] === TARGET_TYPE_NAME) {
                                        // 患者台帳が複数
                                        rootValues = setRootValues(value);
                                        existTarget = true;
                                    }
                                })
                            } else {
                                if (root["がん種"] === TARGET_TYPE_NAME) {
                                    // 患者台帳が1つ
                                    rootValues = setRootValues(root);
                                    existTarget = true;
                                }

                            }
                        }
                    }
                })
            } else {
                caseInfo = {};
            }
        }
    } 

    if (!existTarget) {
        alert("出力対象のデータがありません")
        return;
    }

    // データが無くても項目名は出したい
    output.push("－－－基本情報－－－");
    output.push(`氏名：${convertString(caseInfo["name"])}`);
    output.push(`年齢：${calcAge(caseInfo["date_of_birth"])} 歳`);
    output.push(`外来ID：${convertString(caseInfo["his_id"])}`);
    output.push(``);
    output.push("－－－術前情報－－－");
    // スキーマと同じ条件で確認
    var ctnmT = convertString(convertJsonObj(rootValues.preoperativeTNM["T"])["T"]);
    if (ctnmT && new RegExp("^T1a.*").test(ctnmT)) {
        ctnmT = `${ctnmT}(${convertString(convertJsonObj(rootValues.preoperativeTNM["T"])["T1a期 詳細入力"])})`
    }
    output.push(`術前TNM分類（第8版）T：${ctnmT}`);
    output.push(`術前TNM分類（第8版）N：${convertString(convertJsonObj(rootValues.preoperativeTNM["N"])["N"])}`);
    output.push(`術前TNM分類（第8版）M：${convertString(convertJsonObj(rootValues.preoperativeTNM["M"])["M"])}`);
    output.push(``);
    output.push("－－－手術情報－－－");

    if (Array.isArray(rootValues.operations) && rootValues.operations.length > 0) {
        var num = 1;
        rootValues.operations.forEach(operation => {
            if (operation["実施手術"]) {
                var operationMethods = operation["実施手術"]["実施手術"];
                var operationMethodStr = "";
                if (operationMethods && Array.isArray(operationMethods) && operationMethods.length > 0) {
                    var methodsStr = [];
                    operationMethods.forEach(method => {
                        // スキーマと同じ条件で確認
                        if (method) {
                            methodsStr.push(
                                getTextWithAdditional(method["術式"], method["自由入力"],
                                    ["その他の開腹手術", "その他の腟式手術", "その他の腹腔鏡手術", "その他のロボット支援下手術"])
                            );
                        }
                    });
                    if (methodsStr.length > 0) {
                        operationMethodStr = methodsStr.join(",");
                    }
                }
                output.push(`＜手術情報 ${num}件目＞`);
                output.push(`　手術年月日：${convertString(operation["手術日"])}`);
                output.push(`　術式：${operationMethodStr}`);
                output.push(`　詳細：`);
                num++;
            }
        });

    } else {
        output.push(`＜手術情報 1件目＞`);
        output.push(`　手術年月日：`);
        output.push(`　術式：`);
        output.push(`　詳細：`);
    }
    output.push(``);
    output.push(`術後診断：子宮頸がん`);
    output.push(`stage(FIGO2018)：${convertString(rootValues.staging["FIGO"])}`);
    var ctnmT = convertString(convertJsonObj(rootValues.stagingTNM["T"])["T"]);
    // スキーマと同じ条件で確認
    if (ctnmT && new RegExp("^T1a.*").test(ctnmT)) {
        var additionalText = [];
        var t1aDetail = convertJsonObj(rootValues.stagingTNM["T"])["T1a期 詳細入力"];
        if (t1aDetail) additionalText.push(t1aDetail);
        var t1aThickness = convertJsonObj(rootValues.stagingTNM["T"])["T1a期 腫瘍の厚さ"];
        if (t1aThickness) additionalText.push(t1aThickness);
        if (additionalText.length > 0) {
            ctnmT = `${ctnmT}(${additionalText.join("、")})`
        }
    }
    output.push(`TNM分類（2021）T：${ctnmT}`);
    output.push(`TNM分類（2021）N：`);
    output.push(`　骨盤リンパ節に対する処置：${convertString(convertJsonObj(rootValues.stagingTNM["N"])["RP"])}`);
    output.push(`　骨盤リンパ節の所見　　　：${convertString(convertJsonObj(rootValues.stagingTNM["N"])["RPX"])}`);
    output.push(`　傍大動脈リンパ節に対する処置：${convertString(convertJsonObj(rootValues.stagingTNM["N"])["RA"])}`);
    output.push(`　傍大動脈リンパ節の所見　　　：${convertString(convertJsonObj(rootValues.stagingTNM["N"])["RAX"])}`);

    output.push(`TNM分類（2021）M：${convertString(convertJsonObj(rootValues.stagingTNM["M"])["M"])}`);
    output.push(``);
    output.push("－－－組織診・病理－－－");
    var tissueType = convertString(rootValues.pathology["組織型"]);
    // スキーマと同じ条件で分岐
    if (tissueType == "その他") {
        tissueType = `${tissueType}(${convertString(rootValues.pathology["その他組織型"])})`
    } else if (["扁平上皮癌 HPV関連", "扁平上皮癌 HPV非依存性", "扁平上皮癌, NOS"].includes(tissueType)) {
        tissueType = `${tissueType}(${convertString(rootValues.pathology["扁平上皮癌 詳細"])})`
    } else if (["腺癌 HPV関連", "腺癌 HPV非依存性", "腺癌, NOS"].includes(tissueType)) {
        tissueType = `${tissueType}(${convertString(rootValues.pathology["腺癌 詳細"])})`
    }
    output.push(`組織診断：${tissueType}`);
    output.push(`術前円切標本 間質浸潤：`);
    output.push(`　　　　　　 縦軸方向：`);
    output.push(`　　　　　　 脈管侵襲：`);
    output.push(`g-BRCA BRCA1変異：${convertString(rootValues.genes["BRCA1変異"])}`);
    output.push(`　　　　BRCA2変異：${convertString(rootValues.genes["BRCA2変異"])}`);
    output.push(`HRD：${convertString(rootValues.genes["HRD"])}`);
    output.push(`MSI：${convertString(rootValues.genes["MSI"])}`);  
    output.push(``);

    if (Array.isArray(rootValues.pathlogyReportList) && rootValues.pathlogyReportList.length > 0) {
        var num = 1;
        var hasOutput = false;
        rootValues.pathlogyReportList.forEach(pathlogyReport => {
            if(pathlogyReport){
                if (pathlogyReport["所見"]) {
                    output.push(`＜摘出病理所見 ${num}件目＞`);
                    output.push(`　検査実施日：${convertString(pathlogyReport["検査実施日"])}`);
                    output.push(`　標本番号：${convertString(pathlogyReport["標本番号"])}`);
                    output.push(`　病理診断：${convertString(pathlogyReport["病理診断"])}`);
                    output.push(`　所見：${convertString(pathlogyReport["所見"])}`);
                    num++;
                    hasOutput = true;
                }
            }
        });

    }

    if (!hasOutput) {
        output.push(`＜摘出病理所見 1件目＞`);
        output.push(`　確認日：`);
        output.push(`　標本番号：`);
        output.push(`　病理診断：`);
        output.push(`　所見：`);
    }

    output.push(``);
    output.push(`摘出病理所見 マクロ腫瘍径：${convertString(rootValues.tumorMaxDiameter["所見"])}`);
    output.push(`腫瘍径計測法：${convertString(rootValues.tumorMaxDiameter["診断方法"])}`);
    output.push(`リンパ節転移 骨盤リンパ節転移　　：${convertString(convertJsonObj(rootValues.findings["骨盤リンパ節転移"])["所見"])}`);
    output.push(`　　　　　　 傍大動脈リンパ節転移：${convertString(convertJsonObj(rootValues.findings["傍大動脈リンパ節転移"])["所見"])}`);
    output.push(`　　　　　　 その他のリンパ節転移：${convertString(convertJsonObj(rootValues.findings["その他のリンパ節転移"])["所見"])}`);
    output.push(`腟壁浸潤：${convertString(convertJsonObj(rootValues.findings["腟壁浸潤"])["所見"])}`);
    output.push(`surgical margin：`);
    output.push(`遠隔転移：${convertString(convertJsonObj(rootValues.findings["リンパ節以外の遠隔転移"])["所見"])}`);
    output.push(``);
    output.push("－－－その他－－－");
    output.push(`特記事項：`);
    output.push(`術後方針：${convertString(rootValues.findings["術後再発リスク"])}`);
    output.push(`　　　　 治療方針：`);
    output.push(`　　　　 詳細：`);
    output.push(`受持医1：`);
    output.push(`受持医2：`);
    output.push(`受持医3：`);
    output.push(`カンファレンス日：`);
    output.push(``);

    // 子画面表示
    openWindow(output.join("\r\n"))
}


