// プロセス名の設定
process.title = "JESGO-WebApp";

const path = require("path");
const express = require("express");
const configValues = require("./config.js");
const router = express.Router();

const app = express();

// ポート情報の設定
const port = configValues.default.webAppPort || process.env.JESGO_WEBAPP_PORT || 3030;

if (process.env.NODE_ENV === 'production') {
  app.use(express.static("../config"));
}

app.use(express.static("dist"));
app.use('/image', express.static('image'));

router.get("*", (req, res, next) => {
  // console.log(`req.path：${req.path}`);
  // TODO 不要？
  if (req.path.startsWith("/sockjs-node/")) {
    // リスエストエラー
    res.status(400).send();
    return;
  }
  res.sendFile(path.join(__dirname, './dist/index.html'));
});

app.use("/", router);

// サーバー起動
app.listen(port, function () {
  console.log(`express: start. port=${port}, mode=${app.settings.env}, node=${process.execPath}`);
  console.log('JESGO Webアプリ起動中...');
});
