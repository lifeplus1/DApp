// @ts-check
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        
        // Browser globals (for frontend)
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        
        // Testing globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        before: 'readonly',
        after: 'readonly',
        jest: 'readonly',
      },
    },
    rules: {
      'no-console': 'off', // Allow console in DeFi projects for debugging
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'prefer-const': 'error',
      'no-unused-vars': 'off', // Turn off base rule
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-expressions': ['error', {
        allowShortCircuit: true,
        allowTernary: true,
      }],
    },
  },
  // Special rules for Node.js files (scripts, config, tests)
  {
    files: ['**/*.{js,mjs,cjs}', '**/scripts/**/*', '**/test/**/*', '**/*.config.*', '**/hardhat.config.*'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off', // Allow require() in Node.js files
      '@typescript-eslint/no-unused-expressions': 'off', // Allow expect() chains in tests
    },
  },
  // Ignore patterns
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      'coverage/**/*',
      'stable-yield-aggregator/coverage/',
      'stable-yield-aggregator/coverage/**/*',
      '*.min.js',
      'stable-yield-aggregator/artifacts/',
      'stable-yield-aggregator/cache/',
      'stable-yield-aggregator/typechain-types/',
      '.next/',
      '.vite/',
      '.turbo/',
      '**/*.min.js',
      '**/lcov-report/**',
    ],
  }
)
