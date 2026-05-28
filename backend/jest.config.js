module.exports = {
    testEnvironment: 'node',
    verbose: true,
    forceExit: true,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    testTimeout: 10000,
    testMatch: [
        '**/tests/**/*.test.js',
    ],
    collectCoverageFrom: [
        'services/*.js'
    ],
    coverageDirectory: 'coverage',

    openHandlesTimeout: 1000,
};