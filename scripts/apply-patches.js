/*
 * npm workspaces の巻き上げ対策として、リポジトリルートから patch-package を実行する。
 *
 * 背景:
 *   packages/backend と packages/frontend は postinstall で patch-package を実行しているが、
 *   ルートで npm install した場合、依存が巻き上げられて ルート/node_modules に配置されるため、
 *   packages/*\/node_modules を見にいく patch-package はパッチ対象を見つけられず、
 *   「パッチが当たっていないのに誰も気づかない」状態になる。
 *   （Docker は packages/backend 配下で個別に npm install が走るため巻き上げが起きず、正しく適用される）
 *
 * 本スクリプトはルートを起点に --patch-dir を指定して patch-package を実行し、
 * 巻き上げ先のパッケージにもパッチを適用する。
 * 対象が存在しない場合でもインストール自体は失敗させない（適用状況の検証は verify-install.js が行う）。
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const patchDirs = [
  path.join('packages', 'backend', 'patches'),
  path.join('packages', 'frontend', 'patches'),
];

const rootDir = path.resolve(__dirname, '..');

for (const dir of patchDirs) {
  const absDir = path.join(rootDir, dir);
  if (!fs.existsSync(absDir)) {
    continue;
  }
  const patchFiles = fs.readdirSync(absDir).filter((f) => f.endsWith('.patch'));
  if (patchFiles.length === 0) {
    continue;
  }
  console.log(`[apply-patches] ${dir} のパッチを適用します (${patchFiles.length}件)`);
  // npx 経由だと Windows でシェル解決に失敗することがあるため、
  // patch-package の実行ファイルを Node で直接起動する
  const patchPackageBin = require.resolve('patch-package/index.js', {
    paths: [rootDir],
  });
  try {
    execFileSync(process.execPath, [patchPackageBin, '--patch-dir', dir], {
      cwd: rootDir,
      stdio: 'inherit',
    });
  } catch (err) {
    // パッチ対象が巻き上げ先に存在しない場合など。インストールは止めない。
    console.warn(
      `[apply-patches] ${dir} の適用でエラーが発生しました。適用状況は verify-install.js で検証されます。`
    );
  }
}
