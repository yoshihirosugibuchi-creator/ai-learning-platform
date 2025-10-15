/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // テストファイルの場所
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  
  // パスマッピング
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  
  // セットアップファイル
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // 型定義ファイル
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  
  // カバレッジ
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  
  // タイムアウト
  testTimeout: 30000,
  
  // 詳細ログ
  verbose: true,
  
  // 並列実行制限
  maxWorkers: 1
}