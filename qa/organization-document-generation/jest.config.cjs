module.exports = {
  rootDir: '../..',
  roots: ['<rootDir>/qa/organization-document-generation'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': [
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
  modulePathIgnorePatterns: ['<rootDir>/coro-frontend/.next/'],
  testPathIgnorePatterns: ['<rootDir>/coro-frontend/.next/'],
  testRegex: 'qa[\\\\/]organization-document-generation[\\\\/].*\\.postgres-spec\\.ts$',
};
