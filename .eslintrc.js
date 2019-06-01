module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
  },
  env: {
    node: true,
    browser: false,
    es6: true,
  },
  overrides: [
    // Test environment
    {
      files: ['test/**'],
      env: {
        jest: true,
      },
      plugins: ['jest'],
      rules: {
        'jest/no-disabled-tests': 'warn',
        'jest/no-focused-tests': 'error',
        'jest/no-identical-title': 'error',
        'jest/prefer-to-have-length': 'warn',
        'jest/valid-expect': 'error',
      },
    },

    // Dev dependencies
    {
      files: ['test/**', 'types/**'],
      rules: {
        'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      },
    },
  ],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'airbnb-base',
    'plugin:import/typescript',
    'prettier',
    'prettier/@typescript-eslint',
  ],
  settings: {
    'import/extensions': ['.js', '.jsx'],
    'import/ignore': [/node_modules/],
  },
  rules: {
    // Replaced by typescript equivalent below
    'no-useless-constructor': 0,
    '@typescript-eslint/no-useless-constructor': 'error',

    // Disabled as named exports are maybe preferred
    'import/prefer-default-export': 0,

    'lines-between-class-members': 0,
    'no-dupe-class-members': 0,
    '@typescript-eslint/array-type': 0,
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/explicit-function-return-type': 0,
  },
};
