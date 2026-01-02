# Complete Testing Guide for Nkabom Daycare API

## Table of Contents

1. [Introduction](#introduction)
2. [Quick Start](#quick-start)
3. [Running Tests](#running-tests)
4. [Test Structure](#test-structure)
5. [Writing Tests](#writing-tests)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Introduction

The Nkabom Daycare API has a comprehensive testing suite built with:

- **Jest** - Testing framework
- **Supertest** - HTTP assertions
- **TypeScript** - Type-safe tests
- **Test Utilities** - Custom helpers for common tasks

## Quick Start

### 1. Install Dependencies

Dependencies are already installed. If needed:

```bash
npm install
```

### 2. Setup Test Database

```sql
-- Create test database
CREATE DATABASE nkabom_daycare_test;
```

### 3. Configure Environment

Update `.env.test` if needed:

```env
DB_NAME=nkabom_daycare_test
DB_USERNAME=postgres
DB_PASSWORD=your_password
```

### 4. Run Tests

```bash
npm test
```

## Running Tests

### All Tests

```bash
npm test
```

### Watch Mode (for development)

```bash
npm run test:watch
```

### With Coverage Report

```bash
npm run test:coverage
```

### Specific Test Suite

```bash
npm run test:auth        # Authentication tests
npm run test:tenant      # Tenant tests
npm run test:children    # Children management tests
npm run test:attendance  # Attendance tests
```

### Single Test File

```bash
npm test -- tests/api/auth.test.ts
```

### Tests Matching Pattern

```bash
npm test -- --testNamePattern="should login"
```

### Verbose Output

```bash
npm run test:verbose
```

## Test Structure

```
tests/
├── setup.ts                           # Global test configuration
├── types/
│   └── fastify.d.ts                  # TypeScript declarations
├── helpers/
│   └── testUtils.ts                  # Utility functions
├── api/                              # API endpoint tests
│   ├── auth.test.ts
│   ├── tenant.test.ts
│   ├── children.test.ts
│   └── attendance.test.ts
├── unit/                             # Unit tests
│   └── services.test.example.ts
├── integration/                      # Integration tests
│   └── full-flow.test.example.ts
├── README.md                         # Comprehensive documentation
├── QUICK_START.md                    # Quick reference
└── TEST_CHECKLIST.md                 # Developer checklist
```

## Writing Tests

### Basic Test Template

```typescript
import Fastify, { FastifyInstance } from 'fastify';
import request from 'supertest';

describe('Feature Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    // Register routes
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should do something', async () => {
    const response = await request(app.server)
      .get('/api/endpoint');

    expect(response.statusCode).toBe(200);
  });
});
```

### Using Test Utilities

```typescript
import {
  generateTestEmail,
  generateTestPhone,
  createTestToken,
  assertSuccess,
  assertError,
} from '../helpers/testUtils';

// Generate test data
const email = generateTestEmail();
const phone = generateTestPhone();

// Create auth token
const token = createTestToken(app, { userId: '123', role: 'admin' });

// Make authenticated request
const response = await request(app.server)
  .get('/api/protected')
  .set('Authorization', `Bearer ${token}`);

// Assert success
assertSuccess(response);

// Or assert error
assertError(response, 404);
```

### Testing with Authentication

```typescript
it('should require authentication', async () => {
  const response = await request(app.server)
    .get('/api/protected');

  expect(response.statusCode).toBe(401);
});

it('should work with valid token', async () => {
  const token = createTestToken(app, {
    userId: 'test-user',
    tenantId: 'test-tenant',
    role: 'admin',
  });

  const response = await request(app.server)
    .get('/api/protected')
    .set('Authorization', `Bearer ${token}`);

  expect(response.statusCode).toBe(200);
});
```

### Testing POST Requests

```typescript
it('should create resource', async () => {
  const data = {
    name: 'Test Resource',
    value: 123,
  };

  const response = await request(app.server)
    .post('/api/resources')
    .set('Authorization', `Bearer ${token}`)
    .send(data);

  expect(response.statusCode).toBe(201);
  expect(response.body.data).toHaveProperty('id');
  expect(response.body.data.name).toBe(data.name);
});
```

### Testing Validation

```typescript
it('should validate required fields', async () => {
  const response = await request(app.server)
    .post('/api/resources')
    .send({}); // Empty data

  expect(response.statusCode).toBe(400);
  expect(response.body).toHaveProperty('error');
});

it('should validate email format', async () => {
  const response = await request(app.server)
    .post('/api/users')
    .send({ email: 'invalid-email' });

  expect(response.statusCode).toBe(400);
});
```

## Best Practices

### ✅ DO

1. **Write descriptive test names**
   ```typescript
   it('should return 404 when user does not exist')
   ```

2. **Test both success and error cases**
   ```typescript
   describe('POST /api/users', () => {
     it('should create user with valid data');
     it('should fail with invalid email');
     it('should fail with duplicate email');
   });
   ```

3. **Use test utilities**
   ```typescript
   const email = generateTestEmail(); // Don't hard-code
   ```

4. **Clean up after tests**
   ```typescript
   afterAll(async () => {
     await cleanDatabase(dataSource, ['users']);
     await app.close();
   });
   ```

5. **Mock external services**
   ```typescript
   mockArkeselService(); // Mock SMS
   mockS3Service();      // Mock file uploads
   ```

### ❌ DON'T

1. **Don't use production database**
2. **Don't hard-code IDs or timestamps**
3. **Don't write order-dependent tests**
4. **Don't skip error case testing**
5. **Don't leave console.log in tests**

## Test Coverage

### View Coverage

```bash
npm run test:coverage
```

### Coverage Reports

- Terminal summary
- HTML report: `coverage/lcov-report/index.html`
- LCOV format: `coverage/lcov.info`

### Coverage Goals

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## Troubleshooting

### Tests Hanging

Increase timeout in jest.config.js:

```javascript
testTimeout: 60000,
```

### Database Connection Errors

1. Verify database exists
2. Check credentials in `.env.test`
3. Ensure PostgreSQL is running

```bash
psql -U postgres -h localhost -d nkabom_daycare_test
```

### TypeScript Errors

```bash
# Clear Jest cache
npx jest --clearCache

# Rebuild
npm run build
```

### Port Already in Use

Tests use `app.server` directly, not HTTP ports.
If you see port conflicts, check for running processes.

### Module Not Found

```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

## Available Test Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | With coverage |
| `npm run test:verbose` | Detailed output |
| `npm run test:auth` | Auth tests only |
| `npm run test:tenant` | Tenant tests only |
| `npm run test:children` | Children tests only |
| `npm run test:attendance` | Attendance tests only |

## Useful Jest Flags

```bash
# Run specific file
npm test -- path/to/test.ts

# Run tests matching pattern
npm test -- --testNamePattern="login"

# Update snapshots
npm test -- -u

# Run in band (sequential)
npm test -- --runInBand

# Show all test results
npm test -- --verbose

# Bail on first failure
npm test -- --bail
```

## Common Assertions

```typescript
// Equality
expect(value).toBe(expected)
expect(object).toEqual(expected)

// Properties
expect(object).toHaveProperty('key')
expect(object).toHaveProperty('key', value)

// Arrays
expect(array).toContain(item)
expect(array).toHaveLength(3)

// Numbers
expect(number).toBeGreaterThan(5)
expect(number).toBeLessThan(10)

// Truthiness
expect(value).toBeTruthy()
expect(value).toBeFalsy()
expect(value).toBeDefined()
expect(value).toBeNull()

// Errors
expect(() => fn()).toThrow()
expect(() => fn()).toThrow('error message')

// Async
await expect(promise).resolves.toBe(value)
await expect(promise).rejects.toThrow()
```

## Documentation Links

- [Tests README](../tests/README.md) - Full documentation
- [Quick Start Guide](../tests/QUICK_START.md) - Get started quickly
- [Test Checklist](../tests/TEST_CHECKLIST.md) - Developer checklist
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest](https://github.com/visionmedia/supertest)

## Next Steps

1. ✅ Tests set up and working
2. ✅ Run first test suite
3. 📝 Add more test coverage
4. 📝 Set up CI/CD integration
5. 📝 Add performance tests
6. 📝 Add E2E tests

---

**Happy Testing! Build with confidence!** 🚀✅
