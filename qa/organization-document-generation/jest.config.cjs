module.exports = {
  rootDir: '../..',
  roots: ['<rootDir>/qa/organization-document-generation'],
  testEnvironment: 'node',
  // Windows QA hosts can spend several seconds in PostgreSQL advisory-lock and
  // sanitizer module initialization. Keep this integration suite's timeout
  // aligned with the repository PostgreSQL suites instead of Jest's 5 s unit
  // default.
  testTimeout: 60000,
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
          allowJs: true,
        },
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!sanitize-html|htmlparser2|domhandler|domutils|domelementtype|entities|dom-serializer|parse-srcset|launder)',
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  modulePathIgnorePatterns: ['<rootDir>/coro-frontend/.next/'],
  testPathIgnorePatterns: ['<rootDir>/coro-frontend/.next/'],
  testRegex: 'qa[\\\\/]organization-document-generation[\\\\/].*\\.postgres-spec\\.ts$',
};
