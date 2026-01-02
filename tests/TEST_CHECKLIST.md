# Test Checklist for Developers

Use this checklist when writing tests for new features or fixing bugs.

## Before Writing Code

- [ ] Understand the feature requirements
- [ ] Identify what needs to be tested (API endpoints, business logic, edge cases)
- [ ] Review existing tests for similar features
- [ ] Set up test database if not already configured

## Writing Tests

### API Endpoint Tests

- [ ] **Success Cases**
  - [ ] Test successful request with valid data
  - [ ] Test successful request with optional parameters
  - [ ] Verify correct status code (200, 201, etc.)
  - [ ] Verify response structure and data

- [ ] **Error Cases**
  - [ ] Test with missing required fields
  - [ ] Test with invalid data types
  - [ ] Test with invalid format (email, phone, date, etc.)
  - [ ] Test with non-existent resources (404)
  - [ ] Test with unauthorized access (401)
  - [ ] Test with forbidden access (403)

- [ ] **Authentication & Authorization**
  - [ ] Test without authentication token
  - [ ] Test with invalid token
  - [ ] Test with expired token
  - [ ] Test with wrong tenant access
  - [ ] Test with insufficient permissions

- [ ] **Validation**
  - [ ] Test field length limits
  - [ ] Test special characters handling
  - [ ] Test SQL injection attempts
  - [ ] Test XSS attempts
  - [ ] Test boundary values

### Business Logic Tests

- [ ] **Happy Path**
  - [ ] Test normal workflow
  - [ ] Test with valid inputs
  - [ ] Verify expected outcomes

- [ ] **Edge Cases**
  - [ ] Test with minimum values
  - [ ] Test with maximum values
  - [ ] Test with empty values
  - [ ] Test with null/undefined
  - [ ] Test with special characters

- [ ] **Error Handling**
  - [ ] Test with invalid inputs
  - [ ] Test when dependencies fail
  - [ ] Test timeout scenarios
  - [ ] Verify error messages are helpful

### Data Management

- [ ] **CRUD Operations**
  - [ ] Create - test data creation
  - [ ] Read - test data retrieval
  - [ ] Update - test data modification
  - [ ] Delete - test data removal

- [ ] **Data Integrity**
  - [ ] Test unique constraints
  - [ ] Test foreign key relationships
  - [ ] Test required fields
  - [ ] Test data validation rules

- [ ] **Multi-tenancy**
  - [ ] Test tenant isolation
  - [ ] Test cross-tenant access prevention
  - [ ] Test tenant-specific data retrieval

## Test Quality

- [ ] Tests have clear, descriptive names
- [ ] Tests are independent (don't rely on other tests)
- [ ] Tests clean up after themselves
- [ ] Tests use helper functions for common operations
- [ ] Tests are fast (mock external services)
- [ ] Tests are deterministic (no random failures)
- [ ] Tests follow existing code style and patterns

## Coverage

- [ ] All new endpoints have tests
- [ ] All new business logic has tests
- [ ] All error paths are tested
- [ ] Critical paths have integration tests
- [ ] Run coverage report: `npm run test:coverage`
- [ ] Review coverage report for gaps
- [ ] Aim for >80% coverage on new code

## Before Committing

- [ ] All tests pass: `npm test`
- [ ] No console.log or debugging code left
- [ ] Test names are descriptive
- [ ] Test file is in correct directory
- [ ] Updated test documentation if needed
- [ ] Added test script to package.json if new test suite

## Example Test Structure

```typescript
describe('Feature Name', () => {
  // Setup
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    // Initialize test environment
  });

  afterAll(async () => {
    // Clean up
  });

  describe('POST /api/endpoint', () => {
    it('should succeed with valid data', async () => {
      // Arrange
      const testData = { /* ... */ };

      // Act
      const response = await request(app.server)
        .post('/api/endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData);

      // Assert
      expect(response.statusCode).toBe(201);
      expect(response.body.data).toHaveProperty('id');
    });

    it('should fail with invalid data', async () => {
      // Test error case
    });

    it('should fail without authentication', async () => {
      // Test auth requirement
    });
  });
});
```

## Common Mistakes to Avoid

- ❌ Tests that depend on execution order
- ❌ Hard-coded IDs or timestamps
- ❌ Using production database
- ❌ Not cleaning up test data
- ❌ Testing implementation instead of behavior
- ❌ Overly complex test setup
- ❌ Missing error case tests
- ❌ Not using test utilities
- ❌ Skipping tests (fit, xit)
- ❌ Unclear test descriptions

## Test Naming Convention

### Good Test Names ✅
```typescript
it('should create user with valid data')
it('should return 404 when user not found')
it('should reject invalid email format')
it('should prevent duplicate user registration')
```

### Bad Test Names ❌
```typescript
it('test 1')
it('works')
it('should work correctly')
it('tests the endpoint')
```

## Quick Reference

### Running Tests
```bash
npm test                      # All tests
npm run test:watch            # Watch mode
npm run test:coverage         # With coverage
npm test -- path/to/test.ts   # Specific file
npm test -- --testNamePattern="pattern"  # Specific test
```

### Assertions
```typescript
expect(value).toBe(expected)
expect(value).toEqual(expected)
expect(value).toHaveProperty('key', value)
expect(array).toContain(item)
expect(array).toHaveLength(length)
expect(fn).toThrow()
expect(response.statusCode).toBe(200)
```

### Async Testing
```typescript
it('should handle async operations', async () => {
  const result = await someAsyncFunction();
  expect(result).toBeDefined();
});
```

### Mocking
```typescript
jest.mock('module-name');
const mockFn = jest.fn().mockResolvedValue('value');
expect(mockFn).toHaveBeenCalledWith(args);
```

## Resources

- [tests/README.md](./README.md) - Full documentation
- [tests/QUICK_START.md](./QUICK_START.md) - Quick start guide
- [tests/helpers/testUtils.ts](./helpers/testUtils.ts) - Helper functions
- [tests/api/](./api/) - Example API tests
- [Jest Matchers](https://jestjs.io/docs/expect) - All assertions

---

**Print this checklist and keep it handy while writing tests!** ✅
