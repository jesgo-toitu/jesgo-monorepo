/*
 * インストール結果の検証
 *
 * 「パッチが当たっていないことに誰も気づけない」状態を防ぐため、
 * インストール後に次を検証し、問題があれば異常終了する。
 *
 *   1. patch-package のパッチが、各ワークスペースが実際に読み込む位置に適用されているか
 *      （npm workspaces の巻き上げにより、ルート/node_modules と
 *        packages/*\/node_modules のどちらに配置されるかが環境で変わるため、
 *        Node の解決順序と同じ順序で探して検証する）
 *   2. bcrypt のネイティブバイナリが読み込めるか
 *      （npm 11 は install スクリプトを既定で実行しないため、
 *        package.json の allowScripts の設定漏れでバイナリが生成されず、
 *        全ユーザーがログインできなくなる事故を防ぐ）
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const errors = [];
const infos = [];

/** パッチファイルから「対象ファイルの node_modules 配下の相対パス」と「追加行」を取り出す */
const parsePatch = (patchPath) => {
  const text = fs.readFileSync(patchPath, 'utf8');
  const lines = text.split(/\r?\n/);
  const targets = [];
  let current = null;
  for (const line of lines) {
    const m = /^\+\+\+ b\/node_modules\/(.+)$/.exec(line);
    if (m) {
      current = { relPath: m[1].trim(), added: [] };
      targets.push(current);
      continue;
    }
    if (current && line.startsWith('+') && !line.startsWith('+++')) {
      const body = line.slice(1).trim();
      if (body.length >= 12) current.added.push(body);
    }
  }
  return targets;
};

/** ワークスペースから見て Node が実際に解決する位置を、解決順序どおりに探す */
const resolveFromWorkspace = (workspaceDir, relPath) => {
  const candidates = [
    path.join(rootDir, workspaceDir, 'node_modules', relPath),
    path.join(rootDir, 'node_modules', relPath),
  ];
  return candidates.find((c) => fs.existsSync(c));
};

const patchTargets = [
  { workspace: path.join('packages', 'backend'), dir: path.join('packages', 'backend', 'patches') },
  { workspace: path.join('packages', 'frontend'), dir: path.join('packages', 'frontend', 'patches') },
];

for (const { workspace, dir } of patchTargets) {
  const absDir = path.join(rootDir, dir);
  if (!fs.existsSync(absDir)) continue;
  for (const file of fs.readdirSync(absDir).filter((f) => f.endsWith('.patch'))) {
    for (const target of parsePatch(path.join(absDir, file))) {
      const resolved = resolveFromWorkspace(workspace, target.relPath);
      if (!resolved) {
        infos.push(`${file}: 対象 ${target.relPath} が未インストールのため検証をスキップしました`);
        continue;
      }
      if (target.added.length === 0) {
        infos.push(`${file}: 検証に使える追加行がないためスキップしました`);
        continue;
      }
      const content = fs.readFileSync(resolved, 'utf8');
      const marker = target.added.reduce((a, b) => (b.length > a.length ? b : a));
      if (content.includes(marker)) {
        infos.push(`${file}: 適用済み (${path.relative(rootDir, resolved)})`);
      } else {
        errors.push(
          `${file} のパッチが適用されていません。\n` +
            `    対象: ${path.relative(rootDir, resolved)}\n` +
            `    対処: リポジトリルートで npm run apply:patches を実行してください。`
        );
      }
    }
  }
}

// bcrypt のネイティブバイナリ検証
const bcryptDir = resolveFromWorkspace(path.join('packages', 'backend'), 'bcrypt');
if (!bcryptDir) {
  infos.push('bcrypt: 未インストールのため検証をスキップしました');
} else {
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const bcrypt = require(bcryptDir);
    const hash = bcrypt.hashSync('verify-install', 10);
    if (bcrypt.compareSync('verify-install', hash) !== true) {
      throw new Error('ハッシュの照合結果が不正です');
    }
    infos.push(`bcrypt: 正常に読み込めました (${path.relative(rootDir, bcryptDir)})`);
  } catch (err) {
    errors.push(
      'bcrypt のネイティブバイナリを読み込めません。このままではログイン処理が動作しません。\n' +
        `    詳細: ${err.message}\n` +
        '    対処: package.json の allowScripts に bcrypt が含まれているか確認し、\n' +
        '          リポジトリルートで npm install を実行し直してください\n' +
        '          (npm 11 は install スクリプトを既定で実行しません)。'
    );
  }
}

for (const info of infos) console.log(`[verify-install] ${info}`);

if (errors.length > 0) {
  console.error('\n[verify-install] インストール結果の検証に失敗しました:\n');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('[verify-install] 検証に成功しました');
