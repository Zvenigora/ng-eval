import baseConfig from '../../eslint.config.mjs';
import nx from '@nx/eslint-plugin';
import jsoncEslintParser from 'jsonc-eslint-parser';

export default [
  ...baseConfig,
  ...nx.configs['flat/angular'],
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'zvenigora',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'zvenigora',
          style: 'kebab-case',
        },
      ],
      // The Angular v22 migration added an explicit `ChangeDetectionStrategy.Eager` to
      // preserve pre-v22 default behavior, which this rule (not previously configured
      // by the user) now flags. Switching to OnPush is a behavioral change out of
      // scope for this Nx/Angular version migration.
      '@angular-eslint/prefer-on-push-component-change-detection': 'off',
    },
  },
  ...nx.configs['flat/angular-template'],
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': 'error',
    },
    languageOptions: {
      parser: jsoncEslintParser,
    },
  },
];
