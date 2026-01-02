# Integration Testing Guide

## The Problem with Mock-Only Tests

You're absolutely correct - mocked tests don't verify that:
- Your actual controllers work
- Database operations succeed
- Routes are correctly configured
- Request validation works
- Authentication logic functions properly

## The Solution: Two-Tier Testing Strategy

### Tier 1: Unit Tests (Fast, Isolated)
- Test individual functions and utilities
- Test validation logic
- Test helper functions
- **Don't require database**
- Run very quickly

### Tier 2: Integration Tests (Comprehensive, Realistic)
- Test actual API endpoints with real controllers
- Use real database connections
- Verify complete request/response flow
- Test authentication, authorization, and data persistence
- **Require database setup**
- Slower but more comprehensive

## Setting Up Integration Tests

### Step 1: Create Test Database

```sql
CREATE DATABASE nkabom_daycare_test;
```

### Step 2: Update .env.test

```env
DB_NAME=nkabom_daycare_test
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
```

### Step 3: Run Integration Tests

The integration tests in `tests/api/` (auth.test.ts, tenant.test.ts, etc.) require:

1. **Real database connection**
2. **Controllers properly wired**
3. **Services initialized**

## Making Integration Tests Work

The current integration tests need the **full app context**. Here's how to make them work:

### Option A: Test Against Running Server (Recommended for Now)

1. Start your development server:
```bash
npm run dev
```

2. Create e2e tests that hit the actual running server:
```bash
npm run test:e2e
```

### Option B: Import and Initialize Full App

Create a test app factory that initializes everything properly:

```typescript
// tests/helpers/createTestApp.ts
import { createApp } from '../../src/app'; // You'd need to export this

export async function createTestApp() {
  const app = await createApp({
    logger: false,
    // test-specific config
  });

  return app;
}
```

### Option C: Test Individual Pieces (Current Setup)

The current tests try to test controllers in isolation, but controllers depend on:
- Database connection (TypeORM)
- Repositories
- Services
- Request context

This requires complex mocking or actual database setup.

## Recommended Approach

### 1. Keep Simple Unit Tests

Test utilities, validators, and pure functions:

```typescript
// tests/unit/validators.test.ts
describe('Email Validation', () => {
  it('should validate correct email', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
  });
});
```

### 2. Add E2E Tests Against Running Server

Test the actual API:

```typescript
// tests/e2e/auth.test.ts
const API_URL = 'http://localhost:3000';

describe('Auth E2E Tests', () => {
  it('should register new user', async () => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'SecurePass123!',
        // ... other fields
      })
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('token');
  });
});
```

### 3. Or Create Proper Integration Test Setup

This requires refactoring to export app initialization:

```typescript
// src/app.ts (new file)
export async function createApp(options = {}) {
  const fastify = Fastify(options);

  // Register all plugins
  await registerPlugins(fastify);

  // Register all routes
  await registerRoutes(fastify);

  return fastify;
}

// tests/integration/auth.test.ts
import { createApp } from '../../src/app';

let app;

beforeAll(async () => {
  app = await createApp({ logger: false });
  await app.ready();
});

// Now test against real app with real database
```

## What Works Right Now

✅ **tests/api/health.test.ts** - Simple mock test (works immediately)
✅ **Test utilities and helpers** - All utility functions work
✅ **Jest configuration** - Properly configured

⚠️ **tests/api/auth.test.ts** - Requires database + full app setup
⚠️ **tests/api/tenant.test.ts** - Requires database + full app setup
⚠️ **tests/api/children.test.ts** - Requires database + full app setup
⚠️ **tests/api/attendance.test.ts** - Requires database + full app setup

## Quick Win: E2E Testing

The fastest way to test your actual API:

1. **Create e2e test directory:**
```bash
mkdir tests/e2e
```

2. **Write tests that call your running API:**
```typescript
// tests/e2e/smoke.test.ts
describe('API Smoke Tests', () => {
  const BASE_URL = 'http://localhost:3000';

  it('should respond to health check', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    expect(res.status).toBe(200);
  });

  it('should create tenant', async () => {
    const res = await fetch(`${BASE_URL}/api/tenants/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationName: 'Test Org',
        slug: 'test-org-' + Date.now(),
        // ... all required fields
      })
    });

    expect(res.status).toBe(201);
  });
});
```

3. **Run with server running:**
```bash
# Terminal 1
npm run dev

# Terminal 2
npm run test:e2e
```

## Summary

**For immediate testing of your actual API:**
- ✅ Use E2E tests against running server
- ✅ Test real URLs, real database, real logic
- ✅ Know everything actually works

**For fast unit tests:**
- ✅ Test utilities and helpers
- ✅ Test validation functions
- ✅ Mock-based tests for quick feedback

**For true integration tests:**
- 📝 Requires refactoring app initialization
- 📝 Export app factory function
- 📝 Use in tests with test database

Would you like me to create E2E tests that work against your running server? That's the most practical solution right now.
