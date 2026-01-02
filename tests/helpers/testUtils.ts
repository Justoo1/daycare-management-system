import { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';

/**
 * Generate a random email for testing
 */
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `test-${timestamp}-${random}@example.com`;
}

/**
 * Generate a random phone number for testing (Ghana format)
 * Valid Ghana prefixes: MTN (024, 054, 055, 059), Vodafone (020, 050), AirtelTigo (027, 057, 026, 056)
 * Format: 0XX XXXXXXX (10 digits total)
 */
export function generateTestPhone(): string {
  const validPrefixes = ['24', '54', '55', '59', '20', '50', '27', '57', '26', '56'];
  const prefix = validPrefixes[Math.floor(Math.random() * validPrefixes.length)];

  // Generate unique 7 remaining digits using timestamp + random
  const timestamp = Date.now().toString().slice(-4); // Last 4 digits of timestamp
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // 3 random digits

  // Format: 0 + 2-digit prefix + 7 digits = 10 digits total
  return `0${prefix}${timestamp}${random}`;
}

/**
 * Generate random test data
 */
export function generateTestData() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);

  return {
    email: generateTestEmail(),
    phone: generateTestPhone(),
    firstName: `TestFirst${random}`,
    lastName: `TestLast${random}`,
    organizationName: `TestOrg${random}`,
    slug: `test-org-${timestamp}-${random}`,
  };
}

/**
 * Create a test JWT token
 */
export function createTestToken(fastify: FastifyInstance, payload: any): string {
  // Type assertion to access jwt plugin methods
  const app = fastify as any;
  return app.jwt.sign(payload);
}

/**
 * Wait for a specific amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Clean up database tables for testing
 */
export async function cleanDatabase(dataSource: DataSource, tables: string[]): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();

  try {
    await queryRunner.startTransaction();

    // Disable foreign key checks
    await queryRunner.query('SET session_replication_role = replica;');

    // Delete from tables
    for (const table of tables) {
      await queryRunner.query(`DELETE FROM "${table}"`);
    }

    // Re-enable foreign key checks
    await queryRunner.query('SET session_replication_role = DEFAULT;');

    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

/**
 * Get database connection for tests
 */
export async function getTestDataSource(): Promise<DataSource> {
  const { DataSource } = await import('typeorm');
  const { config } = await import('../../src/config/environment');

  return new DataSource({
    type: 'postgres',
    host: config.database.host,
    port: config.database.port,
    username: config.database.username,
    password: config.database.password,
    database: config.database.name, // Fixed: use 'name' instead of 'database'
    entities: ['src/models/**/*.ts'],
    synchronize: true, // Auto-create tables in test environment
    logging: false,
  });
}

/**
 * Create a test child data object
 */
export function createChildTestData(overrides: Partial<any> = {}): any {
  const random = Math.floor(Math.random() * 10000);

  return {
    firstName: `ChildFirst${random}`,
    lastName: `ChildLast${random}`,
    dateOfBirth: '2020-01-15',
    gender: 'male',
    ...overrides,
  };
}

/**
 * Create a test guardian data object
 */
export function createGuardianTestData(overrides: Partial<any> = {}) {
  return {
    firstName: generateTestData().firstName,
    lastName: generateTestData().lastName,
    relationship: 'parent',
    phoneNumber: generateTestPhone(),
    email: generateTestEmail(),
    isPrimary: true,
    ...overrides,
  };
}

/**
 * Mock Arkesel SMS service
 */
export function mockArkeselService() {
  const axios = require('axios');
  axios.post.mockResolvedValue({
    data: {
      code: '1000',
      message: 'SMS sent successfully',
      balance: 100,
    },
  });
}

/**
 * Mock AWS S3 service
 */
export function mockS3Service() {
  return {
    upload: jest.fn().mockResolvedValue({
      Location: 'https://test-bucket.s3.amazonaws.com/test-file.jpg',
      Key: 'test-file.jpg',
      Bucket: 'test-bucket',
    }),
    deleteObject: jest.fn().mockResolvedValue({}),
  };
}

/**
 * Extract error message from response
 */
export function extractErrorMessage(response: any): string {
  return response.body?.error || response.body?.message || 'Unknown error';
}

/**
 * Assert response success
 */
export function assertSuccess(response: any) {
  expect(response.statusCode).toBeLessThan(400);
  expect(response.body).toHaveProperty('success');
  if (response.body.success !== undefined) {
    expect(response.body.success).toBe(true);
  }
}

/**
 * Assert response error
 */
export function assertError(response: any, expectedStatus?: number) {
  if (expectedStatus) {
    expect(response.statusCode).toBe(expectedStatus);
  } else {
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
  }
}
