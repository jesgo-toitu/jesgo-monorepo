#!/usr/bin/env node
/**
 * JESGO Release Packaging Script
 * Windows環境向けリリースパッケージを作成
 */

const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

const RELEASE_DIR = 'release';
const PACKAGE_NAME = 'jesgo-release';

async function createReleasePackage() {
  console.log('=== JESGO Release Packaging ===');
  
  try {
    // リリースディレクトリの準備
    console.log('1. Preparing release directory...');
    await fs.ensureDir(RELEASE_DIR);
    await fs.emptyDir(RELEASE_DIR);
    
    const releasePackageDir = path.join(RELEASE_DIR, PACKAGE_NAME);
    await fs.ensureDir(releasePackageDir);
    
    // Backend files
    console.log('2. Copying backend files...');
    const backendSrc = 'packages/backend';
    const backendDest = path.join(releasePackageDir, 'backend');
    
    await fs.copy(path.join(backendSrc, 'backendapp'), path.join(backendDest, 'backendapp'));
    await fs.copy(path.join(backendSrc, 'package.json'), path.join(backendDest, 'package.json'));
    
    // SQL files
    const sqlFiles = ['01_create.sql', '02_insert.sql'];
    for (const sqlFile of sqlFiles) {
      const sqlPath = path.join(backendSrc, 'doc', 'DB', sqlFile);
      if (await fs.pathExists(sqlPath)) {
        await fs.copy(sqlPath, path.join(backendDest, sqlFile));
      }
    }
    
    // Frontend files
    console.log('3. Copying frontend files...');
    const frontendSrc = 'packages/frontend/dist';
    const frontendDest = path.join(releasePackageDir, 'frontend');
    
    if (await fs.pathExists(frontendSrc)) {
      await fs.copy(frontendSrc, frontendDest);
    } else {
      console.warn('Warning: Frontend dist directory not found. Run build first.');
    }
    
    // Root files
    console.log('4. Copying root files...');
    await fs.copy('package.json', path.join(releasePackageDir, 'package.json'));
    
    // Scripts
    const scriptsDir = path.join(releasePackageDir, 'scripts');
    await fs.ensureDir(scriptsDir);
    await fs.copy('scripts/deploy-windows.ps1', path.join(scriptsDir, 'deploy-windows.ps1'));
    
    // Documentation
    console.log('5. Creating documentation...');
    const readmeContent = `# JESGO Release Package

## システム要件
- Windows 10/11 または Windows Server 2019/2022
- Node.js 20.x 以上
- PostgreSQL 14.x 以上

## インストール手順

### 1. 前提条件の確認
- Node.js 20がインストールされていることを確認
- PostgreSQL 14がインストールされ、サービスが起動していることを確認

### 2. デプロイの実行
PowerShellを管理者権限で開き、以下のコマンドを実行：

\`\`\`powershell
cd scripts
.\\deploy-windows.ps1 -Environment production -InstallServices
\`\`\`

### 3. データベース設定
PostgreSQLにjesgo_dbデータベースが作成され、初期データが投入されます。

### 4. サービス起動
- Backend: Windows サービスとして自動起動
- Frontend: IISまたは他のWebサーバーで配信

## 設定ファイル
- Backend設定: \`C:\\jesgo\\backend\\backendapp\\config\\config.json\`
- データベース接続情報を必要に応じて編集してください

## トラブルシューティング
- ログファイル: \`C:\\jesgo\\logs\`
- サービス管理: Windows サービス管理コンソール
- ポート確認: Backend (5000), Frontend (80/443)

## サポート
技術的な問題については、開発チームにお問い合わせください。
`;
    
    await fs.writeFile(path.join(releasePackageDir, 'README.md'), readmeContent);
    
    // バージョン情報ファイル
    const packageJson = await fs.readJson('package.json');
    const versionInfo = {
      version: packageJson.version,
      buildDate: new Date().toISOString(),
      nodeVersion: process.version,
      platform: 'windows'
    };
    await fs.writeJson(path.join(releasePackageDir, 'version.json'), versionInfo, { spaces: 2 });
    
    // ZIP アーカイブ作成
    console.log('6. Creating ZIP archive...');
    const zipPath = path.join(RELEASE_DIR, `${PACKAGE_NAME}-v${packageJson.version}.zip`);
    
    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => {
        console.log(`Archive created: ${zipPath} (${archive.pointer()} bytes)`);
        resolve();
      });
      
      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(releasePackageDir, false);
      archive.finalize();
    });
    
    console.log('\n=== Release Package Created Successfully ===');
    console.log(`Package: ${zipPath}`);
    console.log(`Size: ${(await fs.stat(zipPath)).size} bytes`);
    
  } catch (error) {
    console.error('Error creating release package:', error);
    process.exit(1);
  }
}

// NPM パッケージチェック
async function checkDependencies() {
  try {
    require('archiver');
  } catch (error) {
    console.error('Missing dependency: archiver');
    console.log('Please install: npm install --save-dev archiver');
    process.exit(1);
  }
}

if (require.main === module) {
  checkDependencies().then(() => createReleasePackage());
}

module.exports = { createReleasePackage };
