/**
 * Windows Service Configuration for JESGO Backend
 * winser パッケージ用の設定
 */

module.exports = {
  name: 'JESGO-Backend',
  description: 'JESGO Medical Information System - Backend API Server',
  script: './backendapp/app.js',
  env: {
    NODE_ENV: 'production',
    PORT: '5000'
  },
  
  // Windows Service 設定
  windowsService: {
    displayName: 'JESGO Backend Service',
    serviceName: 'JESGOBackend',
    description: 'JESGO医療情報システム バックエンドAPIサーバー',
    
    // サービス起動設定
    startType: 'auto',  // 自動起動
    
    // 依存サービス
    dependencies: ['PostgreSQL'],
    
    // ログ設定
    logOnAs: {
      account: 'LocalSystem'
    },
    
    // 復旧設定
    recovery: {
      firstFailure: 'restart',
      secondFailure: 'restart',
      subsequentFailures: 'restart',
      resetPeriod: 86400, // 24時間
      restartDelay: 60000 // 1分
    }
  },
  
  // Node.js プロセス設定
  nodeOptions: [
    '--max-old-space-size=2048'
  ],
  
  // 環境変数
  environmentVariables: {
    NODE_ENV: 'production',
    PORT: '5000',
    LOG_LEVEL: 'info'
  }
};
