module.exports = {
  rootDir: '../..',
  roots: ['<rootDir>/qa/organization-document-review'],
  testEnvironment: 'node',
  testTimeout: 30000,
  transform: {
    '^.+\\.(t|j)s$': [
      '<rootDir>/coro-backend/node_modules/ts-jest',
      {
        tsconfig: {
          target: 'ES2022',
          module: 'commonjs',
          esModuleInterop: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          types: ['node', 'jest'],
          typeRoots: ['<rootDir>/coro-backend/node_modules/@types'],
        },
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleDirectories: ['node_modules', '<rootDir>/coro-backend/node_modules'],
  testRegex:
    'qa[\\\\/]organization-document-review[\\\\/].*(?:audit-spec|postgres-audit-spec)\\.ts$',
};
