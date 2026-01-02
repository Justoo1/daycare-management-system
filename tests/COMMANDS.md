# Testing Commands - Quick Reference Card

## 🚀 Most Used Commands

```bash
# Quick test (fastest)
npm test

# All unit tests (68 tests)
npm run test:unit

# E2E tests (real API - requires running server)
npm run dev          # Terminal 1
npm run test:e2e     # Terminal 2

# Watch mode (best for development)
npm run test:watch

# Coverage report
npm run test:coverage
```

---

## 📋 All Available Commands

| Command | What It Does | Tests | Speed |
|---------|--------------|-------|-------|
| `npm test` | Health checks only | 5 | ⚡ Fastest |
| `npm run test:unit` | Unit tests | 68 | ⚡ Fast |
| `npm run test:health` | Same as `npm test` | 5 | ⚡ Fastest |
| `npm run test:e2e` | E2E real API tests | Variable | ⚠️ Medium |
| `npm run test:all` | All tests | 73+ | 🐌 Slow |
| `npm run test:watch` | Watch mode | Auto | ⚡ Fast |
| `npm run test:coverage` | With coverage | All | 🐌 Slow |
| `npm run test:verbose` | Detailed output | All | 🐌 Slow |

---

## 🎯 When to Use Each Command

### During Active Development
```bash
npm run test:watch
```
- Auto-runs tests on file changes
- Immediate feedback
- Best for TDD

### Before Committing
```bash
npm test && npm run test:unit
```
- Quick validation (5 + 68 tests)
- Under 15 seconds
- Catches most issues

### Full Validation
```bash
# Terminal 1
npm run dev

# Terminal 2
npm run test:e2e

# Then
npm run test:coverage
```
- Tests everything
- Real API validation
- Coverage report

### CI/CD Pipeline
```bash
npm run test:unit && npm run test:coverage
```
- Fast and comprehensive
- Generates coverage reports
- No running API needed

---

## 📊 Test Results

### ✅ Currently Passing

```bash
$ npm test
✓ 5 tests passed

$ npm run test:unit
✓ 68 tests passed
```

### Test Breakdown

**Unit Tests (68):**
- Validation: 27 tests
- Helpers: 23 tests
- Utilities: 18 tests

**API Tests (5):**
- Health checks: 5 tests

**E2E Tests:**
- Ready to use
- Requires running API

---

## 🔧 Advanced Usage

### Run Specific Test File
```bash
npm test -- tests/unit/validation.test.ts
```

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="email"
```

### Run Tests in Specific Directory
```bash
npm test -- tests/unit
```

### Update Snapshots
```bash
npm test -- -u
```

### Run in Band (Sequential)
```bash
npm test -- --runInBand
```

### Show Coverage for Specific Files
```bash
npm run test:coverage -- --collectCoverageFrom="src/services/**"
```

### Debug Mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

---

## 📈 Coverage Commands

### Generate Coverage
```bash
npm run test:coverage
```

### View HTML Report
```bash
npm run test:coverage
# Then open: coverage/lcov-report/index.html
```

### Coverage for Specific Pattern
```bash
npm run test:coverage -- --testPathPattern=unit
```

---

## 🎨 Watch Mode Options

When running `npm run test:watch`:

| Key | Action |
|-----|--------|
| `a` | Run all tests |
| `f` | Run only failed tests |
| `p` | Filter by filename pattern |
| `t` | Filter by test name pattern |
| `q` | Quit watch mode |
| `Enter` | Trigger test run |

---

## 💡 Pro Tips

### Fastest Feedback Loop
```bash
npm run test:watch -- tests/unit/validation.test.ts
```
Watch single file for instant feedback

### Quick Validation
```bash
npm test
```
5 tests in ~2 seconds

### Comprehensive Check
```bash
npm run test:unit && npm run test:coverage
```
All unit tests + coverage

### CI/CD Friendly
```bash
npm test -- --ci --coverage --maxWorkers=2
```
Optimized for CI environments

---

## 🎯 Cheat Sheet

### Development Workflow
```bash
# 1. Start watch mode
npm run test:watch

# 2. Write code and tests
# (Tests run automatically)

# 3. Before commit
npm test && npm run test:unit
```

### Pre-Deploy Checklist
```bash
✓ npm test              # Quick check
✓ npm run test:unit     # Unit tests
✓ npm run test:e2e      # Real API (with server running)
✓ npm run test:coverage # Coverage check
✓ npm run build         # Build passes
```

### Debugging Failed Tests
```bash
# 1. Run with verbose output
npm run test:verbose

# 2. Run specific failing test
npm test -- --testNamePattern="failing test name"

# 3. Add console.log in test
# 4. Re-run
```

---

## 📚 Related Commands

### Linting
```bash
npm run lint            # Check code style
npm run format          # Format code
```

### Development
```bash
npm run dev             # Start dev server
npm run build           # Build for production
npm start               # Run production build
```

---

## 🎓 Examples

### Run All Unit Tests
```bash
$ npm run test:unit

PASS tests/unit/validation.test.ts
PASS tests/unit/helpers.test.ts

Test Suites: 2 passed, 2 total
Tests:       68 passed, 68 total
```

### Run E2E Tests
```bash
# Terminal 1
$ npm run dev
✓ Server running on http://0.0.0.0:3000

# Terminal 2
$ npm run test:e2e

PASS tests/e2e/api.e2e.test.ts
  ✓ should respond to health check
  ✓ should register tenant
  ✓ should authenticate user
```

### Generate Coverage
```bash
$ npm run test:coverage

Coverage summary:
Statements   : 85%
Branches     : 78%
Functions    : 82%
Lines        : 85%
```

---

## 🆘 Troubleshooting

### Tests Won't Run
```bash
# Clear Jest cache
npx jest --clearCache

# Reinstall dependencies
rm -rf node_modules
npm install
```

### Tests Hanging
```bash
# Use shorter timeout
npm test -- --testTimeout=10000

# Force exit
npm test -- --forceExit
```

### Coverage Not Generating
```bash
# Clean and regenerate
rm -rf coverage
npm run test:coverage
```

---

**Print this page and keep it handy!** 📋✨
