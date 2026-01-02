# Nkabom Daycare API - Test Suite

Comprehensive testing suite for the Nkabom Daycare Management API built with Jest and Supertest.

## Overview

This test suite provides automated testing for all major API endpoints and functionality:

- **Authentication** - User registration, login, OTP-based login
- **Tenant Management** - Multi-tenant organization management
- **Children Management** - Child profiles, enrollment, guardians
- **Attendance Tracking** - Check-in/out, absence recording, summaries
- **Activity Logging** - Meals, naps, diaper changes, learning activities
- **Staff Management** - Staff profiles, certifications, shifts, attendance
- **Analytics & Reports** - Attendance trends, enrollment analytics, reporting

## Setup

### Prerequisites

1. **Node.js** (v16 or higher)
2. **PostgreSQL** (v12 or higher)
3. **Test Database** - Create a separate database for testing

### Installation

Dependencies are already installed if you ran `npm install`. If not:

```bash
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
```

### Environment Configuration

Copy the test environment file and configure your test database:

```bash
cp .env.test .env.test.local
```

Edit `.env.test.local` with your test database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=nkabom_daycare_test
JWT_SECRET=test-jwt-secret
```

**IMPORTANT:** Always use a separate test database, never your production database!

### Database Setup

Create the test database:

```sql
CREATE DATABASE nkabom_daycare_test;
```

The test suite will automatically create tables using TypeORM's synchronize feature.

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage Report

```bash
npm run test:coverage
```

### Run Specific Test Suites

```bash
# Auth tests only
npm run test:auth

# Tenant tests only
npm run test:tenant

# Children tests only
npm run test:children

# Attendance tests only
npm run test:attendance
```

### Run Tests with Verbose Output

```bash
npm run test:verbose
```

## Test Structure

```
tests/
├── setup.ts                    # Global test setup and configuration
├── helpers/
│   └── testUtils.ts           # Test utilities and helper functions
└── api/
    ├── auth.test.ts           # Authentication endpoint tests
    ├── tenant.test.ts         # Tenant management tests
    ├── children.test.ts       # Children management tests
    └── attendance.test.ts     # Attendance tracking tests
```

## Test Utilities

The test suite includes helpful utilities in `tests/helpers/testUtils.ts`:

### Data Generation

```typescript
import { generateTestEmail, generateTestPhone, generateTestData } from '../helpers/testUtils';

// Generate random test email
const email = generateTestEmail(); // test-1234567890-5678@example.com

// Generate random test phone (Ghana format)
const phone = generateTestPhone(); // 0201234567

// Generate complete test data
const data = generateTestData(); // { email, phone, firstName, lastName, organizationName, slug }
```

### Test Assertions

```typescript
import { assertSuccess, assertError } from '../helpers/testUtils';

// Assert successful response
assertSuccess(response); // Checks status < 400 and success: true

// Assert error response
assertError(response, 404); // Checks status code and error structure
```

### Authentication Helpers

```typescript
import { createTestToken } from '../helpers/testUtils';

// Create JWT token for authenticated requests
const token = createTestToken(app, {
  tenantId: 'test-tenant-id',
  userId: 'test-user-id',
  role: 'admin',
  email: 'test@example.com',
});
```

### Database Helpers

```typescript
import { cleanDatabase, getTestDataSource } from '../helpers/testUtils';

// Get test database connection
const dataSource = await getTestDataSource();

// Clean specific tables
await cleanDatabase(dataSource, ['users', 'tenants', 'children']);
```

## Writing New Tests

### Basic Test Template

```typescript
import Fastify, { FastifyInstance } from 'fastify';
import request from 'supertest';
import { YourController } from '../../src/controllers/YourController';

describe('Your Feature Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    // Register routes
    app.post('/api/your-route', YourController.yourMethod);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/your-route', () => {
    it('should do something successfully', async () => {
      const response = await request(app.server)
        .post('/api/your-route')
        .send({ data: 'test' });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });
});
```

## Test Coverage

View coverage report after running:

```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory:
- `coverage/lcov-report/index.html` - HTML coverage report
- `coverage/lcov.info` - LCOV format for CI tools

## Best Practices

### 1. Isolate Tests

Each test should be independent and not rely on other tests:

```typescript
beforeEach(async () => {
  // Clean state before each test
  await cleanDatabase(dataSource, ['users']);
});
```

### 2. Use Descriptive Test Names

```typescript
it('should return 404 when user does not exist', async () => {
  // Test implementation
});
```

### 3. Test Both Success and Failure Cases

```typescript
describe('POST /api/users', () => {
  it('should create user successfully', async () => { });
  it('should fail with invalid email', async () => { });
  it('should fail with duplicate email', async () => { });
  it('should fail without required fields', async () => { });
});
```

### 4. Mock External Services

```typescript
import { mockArkeselService, mockS3Service } from '../helpers/testUtils';

beforeAll(() => {
  mockArkeselService(); // Mock SMS service
  mockS3Service();      // Mock file uploads
});
```

### 5. Clean Up After Tests

```typescript
afterAll(async () => {
  await cleanDatabase(dataSource, ['all_test_tables']);
  await dataSource.destroy();
  await app.close();
});
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: nkabom_daycare_test
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v2
```

## Troubleshooting

### Tests Hanging or Timing Out

Increase timeout in jest.config.js:

```javascript
testTimeout: 60000, // 60 seconds
```

### Database Connection Issues

Verify your test database credentials in `.env.test`:

```bash
psql -U postgres -h localhost -d nkabom_daycare_test
```

### Port Already in Use

The test suite starts Fastify without listening on a port (uses `app.server` directly).
If you see port conflicts, check that no other tests are running.

### TypeORM Synchronization Errors

If tables aren't being created, check:
1. Database exists
2. User has CREATE TABLE permissions
3. TypeORM entities are properly imported

## Additional Test Suites to Add

Consider adding tests for:

- [ ] Activity logging (meals, naps, diaper changes)
- [ ] File uploads (photos, documents, videos)
- [ ] Notifications (SMS via Arkesel)
- [ ] Center and class management
- [ ] Milestones and assessments
- [ ] Progress reports
- [ ] Staff management
- [ ] Certifications and shifts
- [ ] Analytics endpoints
- [ ] Report generation
- [ ] Integration tests (full user flows)
- [ ] Performance tests (load testing)
- [ ] Security tests (SQL injection, XSS)

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [TypeScript Jest Guide](https://kulshekhar.github.io/ts-jest/)
- [Fastify Testing Guide](https://www.fastify.io/docs/latest/Guides/Testing/)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review existing test examples
3. Consult the main API documentation
4. Contact the development team

---

**Happy Testing!** 🚀
