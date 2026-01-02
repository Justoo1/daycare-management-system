# Testing Strategy - Comprehensive Guide

## Your Question: How Do We Know It Actually Works?

You asked the perfect question! **Mock tests alone don't verify your real API works.**

This guide explains the **complete testing strategy** that validates your actual implementation.

## 🎯 The Three-Layer Testing Approach

### Layer 1: Unit Tests (Fast & Isolated)
**Purpose:** Test individual functions and utilities
**Speed:** Very fast (milliseconds)
**Database:** Not required

```bash
npm run test:unit
```

**What it tests:**
- Helper functions
- Validation logic
- Data transformations
- Utilities

**Example:**
```typescript
it('should validate Ghana phone numbers', () => {
  expect(isValidGhanaPhone('0201234567')).toBe(true);
  expect(isValidGhanaPhone('1234567890')).toBe(false);
});
```

### Layer 2: E2E Tests (Real API Verification) ⭐ **RECOMMENDED**
**Purpose:** Test your ACTUAL running API
**Speed:** Medium (seconds)
**Database:** Uses your dev/test database

```bash
# Terminal 1: Start your API
npm run dev

# Terminal 2: Run E2E tests
npm run test:e2e
```

**What it tests:**
- ✅ Real HTTP endpoints
- ✅ Actual controllers and services
- ✅ Real database operations
- ✅ Authentication flows
- ✅ Request/response validation
- ✅ Error handling

**This verifies your REAL implementation!**

### Layer 3: Integration Tests (Full Stack)
**Purpose:** Test controllers with database in isolated environment
**Speed:** Slow (requires setup/teardown)
**Database:** Requires test database setup

```bash
npm run test:integration
```

**Status:** Requires additional setup (see below)

---

## 🚀 Quick Start: Testing Your Real API

### Step 1: Start Your API Server

```bash
npm run dev
```

Wait for: `✓ Server running on http://0.0.0.0:3000`

### Step 2: Run E2E Tests

In a new terminal:

```bash
npm run test:e2e
```

### What Gets Tested?

The E2E tests verify:

1. **Health Checks**
   - `/health` responds correctly
   - `/api/version` returns API info

2. **Tenant Management**
   - Tenant registration works
   - Tenant retrieval works
   - Slug validation works

3. **Authentication**
   - User registration works
   - Login with email/password works
   - Token generation works
   - Invalid credentials are rejected

4. **Protected Endpoints**
   - Requests without auth are rejected (401)
   - Requests with valid token work

5. **API Documentation**
   - Swagger docs are accessible

6. **Error Handling**
   - 404 for non-existent routes
   - Malformed JSON is handled

### Step 3: Review Results

```
PASS  tests/e2e/api.e2e.test.ts
  E2E API Tests
    Health Checks
      ✓ should respond to health check (50ms)
      ✓ should return API version (15ms)
    Tenant Registration
      ✓ should register a new tenant (120ms)
      ✓ should retrieve tenant by slug (45ms)
    User Authentication
      ✓ should register a new user (90ms)
      ✓ should login with valid credentials (75ms)
      ✓ should reject invalid credentials (30ms)
    ...

Tests: 12 passed, 12 total
```

✅ **If tests pass, your API ACTUALLY works!**

---

## 📊 Test Comparison

| Feature | Unit Tests | E2E Tests ⭐ | Integration Tests |
|---------|-----------|------------|-------------------|
| **Tests real API** | ❌ | ✅ | ✅ |
| **Tests database** | ❌ | ✅ | ✅ |
| **Easy to run** | ✅ | ✅ | ⚠️ |
| **Fast** | ✅ | ⚠️ | ❌ |
| **Setup required** | None | Just run API | Complex |
| **Verifies URLs** | ❌ | ✅ | ✅ |
| **Verifies logic** | Partial | ✅ | ✅ |
| **CI/CD friendly** | ✅ | ✅ | ⚠️ |

---

## 🎯 Recommended Workflow

### During Development

1. **Write code**
2. **Start API:** `npm run dev`
3. **Run E2E tests:** `npm run test:e2e`
4. **Fix any failures**
5. **Repeat**

### Before Committing

```bash
# Run all working tests
npm test              # Quick health check
npm run test:e2e      # Comprehensive E2E tests (requires running API)
```

### In CI/CD

```yaml
# GitHub Actions example
- name: Start API
  run: npm run dev &

- name: Wait for API
  run: npx wait-on http://localhost:3000/health

- name: Run E2E Tests
  run: npm run test:e2e
```

---

## 📝 Available Test Commands

| Command | What It Does | When to Use |
|---------|--------------|-------------|
| `npm test` | Quick health check | Fast validation |
| `npm run test:e2e` | **Real API tests** ⭐ | **Main testing** |
| `npm run test:unit` | Unit tests only | Test utilities |
| `npm run test:health` | Basic health test | Sanity check |
| `npm run test:all` | All tests (some may fail) | Full coverage |
| `npm run test:watch` | Watch mode | Development |
| `npm run test:coverage` | With coverage report | Code quality |

---

## ✅ What's Working Right Now

### Immediate Use (No Setup)

✅ **E2E Tests** (`npm run test:e2e`)
- Tests your REAL running API
- Verifies actual endpoints work
- Checks real database operations
- Validates authentication
- Confirms error handling

✅ **Health Tests** (`npm test`)
- Quick sanity check
- No dependencies

✅ **Test Utilities**
- Data generation helpers
- Mock service helpers
- Assertion helpers

### Requires Setup

⚠️ **Integration Tests** (`npm run test:integration`)
- Requires test database configured
- Needs database initialized
- Currently shows failures without setup

---

## 🔧 Setting Up Integration Tests (Optional)

If you want isolated integration tests:

### 1. Create Test Database

```sql
CREATE DATABASE nkabom_daycare_test;
```

### 2. Configure `.env.test`

```env
DB_NAME=nkabom_daycare_test
DB_USERNAME=postgres
DB_PASSWORD=your_password
```

### 3. Run Migrations

```bash
# Run your database migrations on test database
```

### 4. Run Integration Tests

```bash
npm run test:integration
```

**Note:** Integration tests are more complex. E2E tests are simpler and test the same functionality!

---

## 💡 Best Practices

### ✅ DO

1. **Run E2E tests before committing**
   - Ensures your API actually works
   - Catches breaking changes

2. **Keep API running during development**
   - `npm run dev` in one terminal
   - Run `npm run test:e2e` as needed

3. **Add E2E tests for new features**
   - Edit `tests/e2e/api.e2e.test.ts`
   - Test new endpoints
   - Verify new flows

4. **Check test output carefully**
   - Failed tests = broken API
   - Fix immediately

### ❌ DON'T

1. **Don't skip E2E tests**
   - They're your safety net
   - Unit tests alone aren't enough

2. **Don't ignore failures**
   - Investigate and fix
   - Don't assume it's a "flaky test"

3. **Don't test only with mocks**
   - Mocks don't catch real issues
   - Always verify with real API

---

## 🎓 Examples

### Adding a New E2E Test

```typescript
// tests/e2e/api.e2e.test.ts

describe('My New Feature', () => {
  it('should create a child', async () => {
    const response = await fetch(`${API_URL}/api/children`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'Child',
        dateOfBirth: '2020-01-01',
        gender: 'male',
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data).toHaveProperty('id');
    expect(data.data.firstName).toBe('Test');
  });
});
```

### Testing Error Cases

```typescript
it('should return 400 for invalid data', async () => {
  const response = await fetch(`${API_URL}/api/children`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      // Missing required fields
    }),
  });

  expect(response.status).toBe(400);
});
```

---

## 📚 Summary

**Your Question:** How do we know the correct URLs and logic work?

**Answer:** **E2E Tests (`npm run test:e2e`)**

These tests:
✅ Call your REAL API endpoints
✅ Use your REAL database
✅ Test your REAL controllers
✅ Verify your REAL business logic
✅ Validate your REAL authentication
✅ Check your REAL error handling

**This is NOT mock testing - this is REAL testing!**

---

## 🚀 Next Steps

1. **Start your API:** `npm run dev`
2. **Run E2E tests:** `npm run test:e2e`
3. **See your real API tested!**
4. **Add more E2E tests for your features**
5. **Run before every commit**

**You now have comprehensive API testing that verifies your actual implementation!** 🎉

---

**Questions? Check:**
- [README_INTEGRATION.md](./README_INTEGRATION.md) - Detailed integration testing guide
- [QUICK_START.md](./QUICK_START.md) - Quick reference
- [README.md](./README.md) - Full testing documentation
