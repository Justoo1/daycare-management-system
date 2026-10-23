# Auth Schema Role Validation Fix

## Problem Identified

The E2E tests were failing with:
```
error: 'body/role must be equal to one of the allowed values'
```

## Root Cause

There was a **mismatch between the auth schema and the UserRole enum**:

### Before Fix:

**Auth Schema** ([src/schemas/auth.schema.ts:13](src/schemas/auth.schema.ts#L13)):
```typescript
role: { type: 'string', enum: ['admin', 'staff', 'guardian'], ... }
```

**UserRole Enum** ([src/types/index.ts:10-17](src/types/index.ts#L10-L17)):
```typescript
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  CENTER_OWNER = 'center_owner',
  DIRECTOR = 'director',
  TEACHER = 'teacher',
  STAFF = 'staff',
  PARENT = 'parent',
}
```

The schema used **completely different values** than the enum!

## Solution Applied

### 1. Fixed Auth Schema

Updated [src/schemas/auth.schema.ts:13](src/schemas/auth.schema.ts#L13):

```typescript
// OLD - Wrong values
role: { type: 'string', enum: ['admin', 'staff', 'guardian'], description: 'User role' }

// NEW - Matches UserRole enum
role: { type: 'string', enum: ['super_admin', 'center_owner', 'director', 'teacher', 'staff', 'parent'], description: 'User role' }
```

### 2. Updated E2E Tests

Updated [tests/e2e/api.e2e.test.ts](tests/e2e/api.e2e.test.ts):

**Added import:**
```typescript
import { UserRole } from '../../src/types';
```

**Changed all role assignments:**
```typescript
// OLD - Hardcoded string
role: 'parent',

// NEW - Using enum
role: UserRole.PARENT,
```

## Benefits

✅ **Type Safety**: Using `UserRole.PARENT` provides autocomplete and compile-time checking

✅ **Consistency**: Schema now matches the actual UserRole enum values

✅ **Maintainability**: If UserRole enum changes, TypeScript will catch mismatches

✅ **Tests Pass**: E2E tests should now work correctly

## Files Modified

1. [src/schemas/auth.schema.ts](src/schemas/auth.schema.ts) - Line 13
   - Changed enum values to match UserRole enum

2. [tests/e2e/api.e2e.test.ts](tests/e2e/api.e2e.test.ts)
   - Added UserRole import
   - Changed all `role: 'parent'` to `role: UserRole.PARENT`

## Available Roles

After this fix, the registration endpoint accepts these roles:

- `super_admin` - `UserRole.SUPER_ADMIN`
- `center_owner` - `UserRole.CENTER_OWNER`
- `director` - `UserRole.DIRECTOR`
- `teacher` - `UserRole.TEACHER`
- `staff` - `UserRole.STAFF`
- `parent` - `UserRole.PARENT`

## Next Steps

Run the E2E tests to verify the fix:

```bash
# Terminal 1 - Start API server
npm run dev

# Terminal 2 - Run E2E tests
npm run test:e2e
```

Expected result: All tests should now pass! ✅

## Recommendation

Consider creating a helper function to convert the UserRole enum to an array for schema validation:

```typescript
// src/schemas/auth.schema.ts
import { UserRole } from '../types';

const allowedRoles = Object.values(UserRole);

export const registerSchema = {
  // ...
  role: { type: 'string', enum: allowedRoles, description: 'User role' },
  // ...
};
```

This would ensure the schema **automatically stays in sync** with the enum.
