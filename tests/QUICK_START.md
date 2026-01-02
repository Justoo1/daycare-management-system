# Quick Start Guide - Testing

Get up and running with tests in 5 minutes!

## 1. Setup Test Database

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create test database
CREATE DATABASE nkabom_daycare_test;

-- Exit psql
\q
```

## 2. Configure Environment

The `.env.test` file is already created. Update these values if needed:

```env
DB_NAME=nkabom_daycare_test
DB_USERNAME=postgres
DB_PASSWORD=your_password
```

## 3. Run Your First Test

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm run test:auth
```

## 4. Common Commands

```bash
# Watch mode (re-runs on file changes)
npm run test:watch

# Verbose output (see all test details)
npm run test:verbose

# Test specific file
npm test -- tests/api/auth.test.ts

# Test with pattern matching
npm test -- --testNamePattern="should login"
```

## 5. Test Results

✅ **Passing Test:**
```
PASS  tests/api/auth.test.ts
  Auth API Tests
    POST /api/auth/register
      ✓ should register a new user successfully (234ms)
```

❌ **Failing Test:**
```
FAIL  tests/api/auth.test.ts
  Auth API Tests
    POST /api/auth/register
      ✕ should register a new user successfully (234ms)
        Expected: 201
        Received: 400
```

## 6. Understanding Test Output

```typescript
describe('Auth API Tests', () => {           // Test Suite
  describe('POST /api/auth/register', () => { // Test Group
    it('should register successfully', () => { // Individual Test
      // Test code here
    });
  });
});
```

## 7. Writing Your First Test

Create `tests/api/example.test.ts`:

```typescript
import request from 'supertest';
import Fastify from 'fastify';

describe('Example Test', () => {
  let app;

  beforeAll(async () => {
    app = Fastify();
    app.get('/hello', async () => ({ message: 'Hello World' }));
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return hello message', async () => {
    const response = await request(app.server).get('/hello');

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Hello World');
  });
});
```

Run it:
```bash
npm test -- tests/api/example.test.ts
```

## 8. Common Test Patterns

### Testing Success Response
```typescript
const response = await request(app.server)
  .post('/api/users')
  .send({ name: 'John' });

expect(response.statusCode).toBe(201);
expect(response.body.success).toBe(true);
expect(response.body.data).toHaveProperty('id');
```

### Testing Error Response
```typescript
const response = await request(app.server)
  .post('/api/users')
  .send({ }); // Missing required fields

expect(response.statusCode).toBe(400);
expect(response.body.success).toBe(false);
expect(response.body).toHaveProperty('error');
```

### Testing with Authentication
```typescript
const token = 'your-jwt-token';

const response = await request(app.server)
  .get('/api/protected')
  .set('Authorization', `Bearer ${token}`);

expect(response.statusCode).toBe(200);
```

## 9. Debugging Tests

### Add console.log
```typescript
it('should work', async () => {
  const response = await request(app.server).get('/api/test');
  console.log('Response:', response.body); // Debug output
  expect(response.statusCode).toBe(200);
});
```

### Run single test
```bash
npm test -- --testNamePattern="should work"
```

### Use Jest's built-in debugging
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 10. Tips & Tricks

### ✅ DO
- Write tests for new features
- Test both success and error cases
- Use descriptive test names
- Clean up test data after tests
- Mock external services

### ❌ DON'T
- Use production database for tests
- Write tests that depend on other tests
- Hard-code IDs or timestamps
- Skip error case testing
- Leave console.log in final tests

## Need Help?

1. Check [tests/README.md](./README.md) for detailed documentation
2. Review existing tests in `tests/api/` for examples
3. Run tests with `--verbose` flag for more details
4. Check Jest documentation: https://jestjs.io

## What's Next?

- ✅ Basic tests working? Add more test suites!
- ✅ Want to test services? Create `tests/unit/` directory
- ✅ Need integration tests? Create `tests/integration/` directory
- ✅ Set up CI/CD? Check tests/README.md for GitHub Actions example

---

**You're all set! Start testing and building robust software!** 🎉
