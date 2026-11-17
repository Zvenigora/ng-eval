module.exports = {
  displayName: 'demo',
  preset: '../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../coverage/apps/demo',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
        // As in eval-core's configuration, and for its reason: the demo sets
        // `isolatedModules: false`, so ts-jest type-checks its specs and would
        // print TS151001, its advice to enable `esModuleInterop`.
        diagnostics: { ignoreCodes: [151001] },
      },
    ],
  },
  // highlight.js's `lib/languages/*.js` set `module.exports` and no `.default`, and the demo
  // does not set `esModuleInterop`, so here a language's default import is undefined, though
  // tsc passes. Its `es/languages/*.js` export a default: map the import there, and let Jest
  // transform those files. `lib/core.js` sets `.default` itself, and needs neither.
  moduleNameMapper: {
    '^highlight\\.js/lib/languages/(.*)$': '<rootDir>/../../node_modules/highlight.js/es/languages/$1.js',
  },
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$|highlight\\.js/es/languages/))'],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
};
