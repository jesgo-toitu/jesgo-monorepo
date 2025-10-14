// プロセス名の設定
process.title = "JESGO-Server";

// ライブラリの読み込み
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';
import router from './routes/';
import { logging, LOGTYPE } from './logic/Logger';
import envVariables from './config';
const app = express();
app.use(helmet());
app.use(cors());

// body-parserの設定
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));
app.use(bodyParser.json({ limit: '1mb' }));

// port番号の設定
// macOSのAirPlay Receiverが5000番ポートを使用するため8000をデフォルトとする
const port = envVariables.serverPort || process.env.JESGO_SERVER_PORT || 8000;

// ------ ルーティング ------ //
app.use('/', router);

// サーバ起動
app.listen(port);
logging(LOGTYPE.INFO, `listen on port ${port}`);
// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
console.log(`express: start. port=${port}, mode=${app.get('env')}, node=${process.execPath}`);
console.log('JESGO サーバー起動中...');
