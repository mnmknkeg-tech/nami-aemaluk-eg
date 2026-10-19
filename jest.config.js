module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.tsx$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@ray-eg/shared/(.*)$': '<rootDir>/packages/shared/src/$1',
    // Marketplace lib helpers under test (security regression tests).
    '^@marketplace-lib/(.*)$': '<rootDir>/apps/marketplace-next/src/lib/$1',
  },
  collectCoverageFrom: [
    'packages/shared/src/lib/**/*.ts',
    'packages/shared/src/hooks/**/*.ts',
    '!**/*.d.ts',
    '!**/*.spec.ts',
    '!**/*.test.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
};
