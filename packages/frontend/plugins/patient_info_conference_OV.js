const script_info = {
    plugin_name: '卵巣癌カンファ',
    plugin_version: '1.0',
    all_patient: false,
    update_db: false,
    attach_patient_info: true,
    show_upload_dialog: false,
    target_schema_id_string: "",
    filter_schema_query: '',
    explain: '卵巣がんのカンファをテキスト形式で出力します',
}
export async function init() {
    return script_info;
}

/**
 * 子画面を表示
 * @param {string} dispText 表示テキスト
 */
function openWindow(dispText) {
    // 子画面のサイズ
    const height = 600;
    const width = 800;
    const subWindowName = "subWindowConferenceOV";  // ※各スクリプトで変える
    const subWindowTitle = "カンファレンス（卵巣がん）";

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
 * 患者台帳　値取得
 * @param {json} root 
 * @returns 
 */
function setRootValues(root) {
    var rootValues = {
        staging: {},
        stagingTMN: {},
        pathology: {},
        findings: {},
        genes: {},
        interperitoneal: {},
    }

    // 卵巣がん以外は処理しない
    if (root["がん種"] === '卵巣がん') {

        // 病期診断
        rootValues.staging = root["病期診断"];
        if (rootValues.staging) {
            if (rootValues.staging["治療施行状況"] === "初回手術施行例") {
                rootValues.stagingTMN = rootValues.staging["pTNM"] == null ? {} : rootValues.staging["pTNM"]
            } else if (rootValues.staging["治療施行状況"] === "術前治療後に手術施行") {
                rootValues.stagingTMN = rootValues.staging["ypTNM"] == null ? {} : rootValues.staging["ypTNM"]
            }
        } else {
            rootValues.staging = {};
        }

        // 初回治療
        var initialTreatment = root["初回治療"];
        if (initialTreatment) {
            rootValues.operations = initialTreatment["手術療法"] == null ? {} : initialTreatment["手術療法"];
        }

        // 組織診断
        rootValues.pathology = root["組織診断"];
        if (rootValues.pathology) {
            // 腫瘍遺伝子検査
            rootValues.genes = rootValues.pathology["腫瘍遺伝子検査"] == null ? {} : rootValues.pathology["腫瘍遺伝子検査"];
        } else {
            rootValues.pathology = {};
        }

        // 診断所見
        rootValues.findings = root["診断所見"];
        if (rootValues.findings) {
            // 腹腔内所見詳細
            rootValues.interperitoneal = rootValues.findings["腹腔内所見詳細"] == null ? {} : rootValues.findings["腹腔内所見詳細"];
        } else {
            rootValues.findings = {};
        }
    }

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
        stagingTMN: {},
        pathology: {},
        findings: {},
        genes: {},
        interperitoneal: {},
    }

    // 経過
    var surveillanceList = {};

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
                        // 卵巣がん
                        if (root) {
                            if (Array.isArray(root) && root.length > 0) {
                                root.forEach((value) => {
                                    if (value && value["がん種"] === '卵巣がん') {
                                        // 患者台帳が複数
                                        rootValues = setRootValues(value);
                                        existTarget = true;
                                    }
                                })
                            } else {
                                if (root["がん種"] === '卵巣がん') {
                                    // 患者台帳が1つ
                                    rootValues = setRootValues(root);
                                    existTarget = true;
                                }

                            }
                        } else if (docList["経過"]) {
                            surveillanceList = docList["経過"]["経過・所見"] == null ? {} : docList["経過"]["経過・所見"];
                            existTarget = true;
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
    output.push("－－－手術情報－－－");

    if (Array.isArray(rootValues.operations) && rootValues.operations.length > 0) {
        var num = 1;
        rootValues.operations.forEach(operation => {
            output.push(`＜手術情報 ${num}件目＞`);
            output.push(`　手術年月日：${convertString(operation["手術日"])}`);
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
            }
            output.push(`　術式：${operationMethodStr}`);
            output.push(`　手術完遂度：${convertString(operation["手術完遂度"])}`);
            output.push(`　残存腫瘍部位：${convertString(operation["残存腫瘍部位"])}`);
            num++;
        });

    } else {
        output.push(`手術年月日：`);
        output.push(`術式：`);
        output.push(`手術完遂度：`);
        output.push(`残存腫瘍部位：`);
    }
    output.push(``);
    output.push(`TNM分類（2021）T：${convertString(rootValues.stagingTMN["T"])}`);
    output.push(`TNM分類（2021）N：${convertString(rootValues.stagingTMN["N"])}`);
    output.push(`TNM分類（2021）M：${convertString(rootValues.stagingTMN["M"])}`);

    output.push(``);
    output.push("－－－組織診・病理－－－");
    var tissueType = rootValues.pathology["組織型"];
    // スキーマと同じ条件で確認
    if (rootValues.pathology["その他組織型"]) {
        tissueType = getTextWithAdditional(
            rootValues.pathology["その他組織型"],
            rootValues.pathology["その他組織型"],
            ["その他の腫瘍", "組織型診断保留中"]
        );
    }
    output.push(`組織診断：${tissueType}`);
    output.push(`g-BRCA BRCA1変異：${convertString(rootValues.genes["BRCA1変異"])}`);
    output.push(`　　　　BRCA2変異：${convertString(rootValues.genes["BRCA2変異"])}`);
    output.push(`HRD：${convertString(rootValues.genes["HRD"])}`);
    output.push(`MSI：${convertString(rootValues.genes["MSI"])}`);
    output.push(`摘出病理所見 被膜破綻　：${convertString(rootValues.findings["皮膜破綻の有無"])}`);
    output.push(`　　　　　　 腹水細胞診：${convertString(rootValues.findings["腹水細胞診"])}`);
    output.push(`　　　　　　 骨盤内臓器進展：${convertString(rootValues.interperitoneal["骨盤内臓器進展"])}`);
    output.push(`　　　　　　 腹腔内播種病変：${convertString(rootValues.interperitoneal["腹腔内臓器進展"])}`);
    output.push(`　　　　　　 腹腔内病変最大径：`);
    output.push(``);

    if (Array.isArray(surveillanceList) && surveillanceList.length > 0) {
        var num = 1;
        var hasOutput = false;
        surveillanceList.forEach(surveillance => {
            var regionalLymphNodes = surveillance["所属リンパ節所見"];
            if (regionalLymphNodes && regionalLymphNodes["所見"]) {
                output.push(`＜所属リンパ節転移 ${num}件目＞`);
                output.push(`　確認日：${convertString(surveillance["確認日"])}`);
                output.push(`　所見　：${convertString(regionalLymphNodes["所見"])}`);
                hasOutput = true;
            }
            num++;
        });

    }

    if (!hasOutput) {
        output.push(`＜所属リンパ節転移 1件目＞`);
        output.push(`　確認日：`);
        output.push(`　所見：`);
    }

    var distantMetastasisStrList = [];
    if (rootValues.stagingTMN["M"] && new RegExp("^1").test(rootValues.stagingTMN["M"])) {
        var distantMetastasis = rootValues.stagingTMN["遠隔転移部位"];
        if (distantMetastasis && Array.isArray(distantMetastasis) && distantMetastasis.length > 0) {
            var num = 1;
            distantMetastasis.forEach((item) => {
                if (item) {
                    distantMetastasisStrList.push(item)
                }
                num++;
            })
        }
    }
    output.push(``);
    output.push(`遠隔転移：${distantMetastasisStrList.join(",")}`);
    output.push(`特記事項：`);
    output.push(``);
    output.push("－－－その他－－－");
    output.push(`術後方針：`);
    output.push(`　　　　 詳細：`);
    output.push(`受持医1：`);
    output.push(`受持医2：`);
    output.push(`受持医3：`);
    output.push(`カンファレンス日：`);
    output.push(``);

    // 子画面表示
    openWindow(output.join("\r\n"))
}


