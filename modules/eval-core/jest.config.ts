module.exports = {
  displayName: 'eval-core',
  preset: '../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../coverage/modules/eval-core',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
        // TS151001 is ts-jest's advice to enable `esModuleInterop`, printed once
        // per worker. The base tsconfig turns it off on purpose, and enabling it
        // for specs alone would let them accept default imports the library
        // build rejects. eval-signals and eval-forms never print it because
        // they set `isolatedModules`.
        diagnostics: { ignoreCodes: [151001] },
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
};
