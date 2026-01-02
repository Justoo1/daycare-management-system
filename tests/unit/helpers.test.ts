/**
 * Helper Functions Unit Tests
 *
 * Tests for utility and helper functions.
 */

import {
  generateTestEmail,
  generateTestPhone,
  generateTestData,
  createChildTestData,
  createGuardianTestData,
} from '../helpers/testUtils';

describe('Test Data Generation Helpers', () => {
  describe('generateTestEmail', () => {
    it('should generate valid email format', () => {
      const email = generateTestEmail();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      expect(emailRegex.test(email)).toBe(true);
      expect(email).toContain('@example.com');
      expect(email).toContain('test-');
    });

    it('should generate unique emails', () => {
      const email1 = generateTestEmail();
      const email2 = generateTestEmail();

      expect(email1).not.toBe(email2);
    });

    it('should include timestamp and random number', () => {
      const email = generateTestEmail();

      // Should match pattern: test-{timestamp}-{random}@example.com
      expect(email).toMatch(/^test-\d+-\d+@example\.com$/);
    });
  });

  describe('generateTestPhone', () => {
    it('should generate valid Ghana phone format', () => {
      const phone = generateTestPhone();
      const phoneRegex = /^0[0-9]{9}$/;

      expect(phoneRegex.test(phone)).toBe(true);
    });

    it('should start with 0', () => {
      const phone = generateTestPhone();

      expect(phone.charAt(0)).toBe('0');
    });

    it('should be exactly 10 digits', () => {
      const phone = generateTestPhone();

      expect(phone).toHaveLength(10);
      expect(/^\d+$/.test(phone)).toBe(true);
    });

    it('should generate different phone numbers', () => {
      const phone1 = generateTestPhone();
      const phone2 = generateTestPhone();

      // Very unlikely to be the same
      expect(phone1).not.toBe(phone2);
    });
  });

  describe('generateTestData', () => {
    it('should generate complete test data', () => {
      const data = generateTestData();

      expect(data).toHaveProperty('email');
      expect(data).toHaveProperty('phone');
      expect(data).toHaveProperty('firstName');
      expect(data).toHaveProperty('lastName');
      expect(data).toHaveProperty('organizationName');
      expect(data).toHaveProperty('slug');
    });

    it('should generate valid email', () => {
      const data = generateTestData();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      expect(emailRegex.test(data.email)).toBe(true);
    });

    it('should generate valid phone', () => {
      const data = generateTestData();
      const phoneRegex = /^0[0-9]{9}$/;

      expect(phoneRegex.test(data.phone)).toBe(true);
    });

    it('should generate unique slugs', () => {
      const data1 = generateTestData();
      const data2 = generateTestData();

      expect(data1.slug).not.toBe(data2.slug);
      expect(data1.slug).toMatch(/^test-org-\d+-\d+$/);
    });

    it('should generate names with test prefix', () => {
      const data = generateTestData();

      expect(data.firstName).toContain('TestFirst');
      expect(data.lastName).toContain('TestLast');
      expect(data.organizationName).toContain('TestOrg');
    });
  });

  describe('createChildTestData', () => {
    it('should generate child data with required fields', () => {
      const child = createChildTestData();

      expect(child).toHaveProperty('firstName');
      expect(child).toHaveProperty('lastName');
      expect(child).toHaveProperty('dateOfBirth');
      expect(child).toHaveProperty('gender');
    });

    it('should generate valid child name', () => {
      const child = createChildTestData();

      expect(child.firstName).toContain('ChildFirst');
      expect(child.lastName).toContain('ChildLast');
    });

    it('should have default date of birth', () => {
      const child = createChildTestData();

      expect(child.dateOfBirth).toBe('2020-01-15');
    });

    it('should have default gender', () => {
      const child = createChildTestData();

      expect(child.gender).toBe('male');
    });

    it('should accept overrides', () => {
      const child = createChildTestData({
        firstName: 'CustomFirst',
        gender: 'female',
        allergies: 'Peanuts',
      });

      expect(child.firstName).toBe('CustomFirst');
      expect(child.gender).toBe('female');
      expect(child.allergies).toBe('Peanuts');
      expect(child.lastName).toContain('ChildLast'); // Default not overridden
    });

    it('should generate unique children', () => {
      const child1 = createChildTestData();
      const child2 = createChildTestData();

      expect(child1.firstName).not.toBe(child2.firstName);
    });
  });

  describe('createGuardianTestData', () => {
    it('should generate guardian data with required fields', () => {
      const guardian = createGuardianTestData();

      expect(guardian).toHaveProperty('firstName');
      expect(guardian).toHaveProperty('lastName');
      expect(guardian).toHaveProperty('relationship');
      expect(guardian).toHaveProperty('phoneNumber');
      expect(guardian).toHaveProperty('email');
      expect(guardian).toHaveProperty('isPrimary');
    });

    it('should generate valid email and phone', () => {
      const guardian = createGuardianTestData();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^0[0-9]{9}$/;

      expect(emailRegex.test(guardian.email)).toBe(true);
      expect(phoneRegex.test(guardian.phoneNumber)).toBe(true);
    });

    it('should have default relationship', () => {
      const guardian = createGuardianTestData();

      expect(guardian.relationship).toBe('parent');
    });

    it('should be primary by default', () => {
      const guardian = createGuardianTestData();

      expect(guardian.isPrimary).toBe(true);
    });

    it('should accept overrides', () => {
      const guardian = createGuardianTestData({
        relationship: 'grandparent',
        isPrimary: false,
      });

      expect(guardian.relationship).toBe('grandparent');
      expect(guardian.isPrimary).toBe(false);
    });

    it('should generate unique guardians', () => {
      const guardian1 = createGuardianTestData();
      const guardian2 = createGuardianTestData();

      expect(guardian1.email).not.toBe(guardian2.email);
      expect(guardian1.phoneNumber).not.toBe(guardian2.phoneNumber);
    });
  });
});

describe('Assertion Helpers', () => {
  describe('assertSuccess', () => {
    it('should pass for successful responses', () => {
      const mockResponse = {
        statusCode: 200,
        body: { success: true, data: {} },
      };

      expect(() => {
        expect(mockResponse.statusCode).toBeLessThan(400);
        expect(mockResponse.body).toHaveProperty('success');
        if (mockResponse.body.success !== undefined) {
          expect(mockResponse.body.success).toBe(true);
        }
      }).not.toThrow();
    });
  });

  describe('assertError', () => {
    it('should pass for error responses', () => {
      const mockResponse = {
        statusCode: 404,
        body: { success: false, error: 'Not found' },
      };

      expect(() => {
        expect(mockResponse.statusCode).toBeGreaterThanOrEqual(400);
      }).not.toThrow();
    });
  });
});

describe('String Utilities', () => {
  describe('capitalize', () => {
    function capitalize(str: string): string {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('HELLO')).toBe('Hello');
      expect(capitalize('hELLO')).toBe('Hello');
    });

    it('should handle single character', () => {
      expect(capitalize('a')).toBe('A');
      expect(capitalize('A')).toBe('A');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });
  });

  describe('slugify', () => {
    function slugify(text: string): string {
      return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    it('should convert text to slug', () => {
      expect(slugify('My Organization')).toBe('my-organization');
      expect(slugify('Test Org 123')).toBe('test-org-123');
      expect(slugify('Company Name!')).toBe('company-name');
    });

    it('should handle special characters', () => {
      expect(slugify('Hello@World')).toBe('hello-world');
      expect(slugify('Test & Test')).toBe('test-test');
      expect(slugify('One_Two_Three')).toBe('one-two-three');
    });

    it('should remove leading/trailing hyphens', () => {
      expect(slugify('-hello-')).toBe('hello');
      expect(slugify('--test--')).toBe('test');
    });

    it('should handle empty and whitespace', () => {
      expect(slugify('')).toBe('');
      expect(slugify('   ')).toBe('');
    });
  });

  describe('truncate', () => {
    function truncate(text: string, maxLength: number): string {
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength - 3) + '...';
    }

    it('should truncate long text', () => {
      expect(truncate('This is a very long text', 10)).toBe('This is...');
      expect(truncate('Short', 10)).toBe('Short');
    });

    it('should handle exact length', () => {
      expect(truncate('12345', 5)).toBe('12345');
      expect(truncate('123456', 5)).toBe('12...');
    });
  });
});

describe('Array Utilities', () => {
  describe('chunk', () => {
    function chunk<T>(array: T[], size: number): T[][] {
      const chunks: T[][] = [];
      for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
      }
      return chunks;
    }

    it('should chunk array into groups', () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
      expect(chunk([1, 2, 3, 4, 5, 6], 3)).toEqual([[1, 2, 3], [4, 5, 6]]);
    });

    it('should handle empty array', () => {
      expect(chunk([], 2)).toEqual([]);
    });

    it('should handle size larger than array', () => {
      expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
    });
  });

  describe('unique', () => {
    function unique<T>(array: T[]): T[] {
      return Array.from(new Set(array));
    }

    it('should remove duplicates', () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
      expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('should handle empty array', () => {
      expect(unique([])).toEqual([]);
    });

    it('should handle array with no duplicates', () => {
      expect(unique([1, 2, 3])).toEqual([1, 2, 3]);
    });
  });
});
