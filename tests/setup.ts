import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../.env.test') });

// Set test timeout
jest.setTimeout(30000);

// Mock external services
jest.mock('axios');

// Global test setup
beforeAll(async () => {
  console.log('Starting test suite...');
});

afterAll(async () => {
  console.log('Test suite completed.');
});

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
