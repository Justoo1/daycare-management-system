export const registerSchema = {
  tags: ['Authentication'],
  description: 'Register a new user account',
  body: {
    type: 'object',
    required: ['email', 'password', 'fullName', 'phoneNumber', 'tenantId', 'role'],
    properties: {
      email: { type: 'string', format: 'email', description: 'User email address' },
      password: { type: 'string', minLength: 8, description: 'User password (min 8 characters)' },
      fullName: { type: 'string', description: 'Full name of the user' },
      phoneNumber: { type: 'string', description: 'Phone number with country code (e.g., +233XXXXXXXXX)' },
      tenantId: { type: 'string', format: 'uuid', description: 'Tenant/Organization ID' },
      role: { type: 'string', enum: ['super_admin', 'center_owner', 'director', 'teacher', 'staff', 'parent'], description: 'User role' },
    },
  },
  response: {
    201: {
      description: 'User registered successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string' },
                fullName: { type: 'string' },
                phoneNumber: { type: 'string' },
                role: { type: 'string' },
                tenantId: { type: 'string' },
                isActive: { type: 'boolean' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
  },
};

export const loginSchema = {
  tags: ['Authentication'],
  description: 'Login with email and password',
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', description: 'User email address' },
      password: { type: 'string', description: 'User password' },
    },
  },
  response: {
    200: {
      description: 'Login successful',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            token: { type: 'string', description: 'JWT access token' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                tenantId: { type: 'string', format: 'uuid' },
                centerId: { type: 'string', format: 'uuid' },
                classId: { type: ['string', 'null'], format: 'uuid', description: 'Assigned class ID for staff/teachers' },
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                phoneNumber: { type: 'string' },
                role: { type: 'string' },
                emailVerified: { type: 'boolean' },
                phoneVerified: { type: 'boolean' },
                profilePhotoUrl: { type: ['string', 'null'] },
                isActive: { type: 'boolean' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
            tenant: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                slug: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

export const sendLoginOTPSchema = {
  tags: ['Authentication'],
  description: 'Send OTP for passwordless login (no authentication required). Simply provide your phone number and receive an OTP via SMS.',
  body: {
    type: 'object',
    required: ['phoneNumber'],
    properties: {
      phoneNumber: { type: 'string', description: 'Phone number (Ghana format, e.g., 0240000000 or +233240000000)' },
    },
  },
  response: {
    200: {
      description: 'OTP sent successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            userExists: { type: 'boolean' },
          },
        },
      },
    },
  },
};

export const loginWithOTPSchema = {
  tags: ['Authentication'],
  description: 'Login with phone number and OTP (passwordless login). Verify the OTP sent to your phone to receive a JWT token.',
  body: {
    type: 'object',
    required: ['phoneNumber', 'otp'],
    properties: {
      phoneNumber: { type: 'string', description: 'Phone number (Ghana format, e.g., 0240000000 or +233240000000)' },
      otp: { type: 'string', minLength: 6, maxLength: 6, description: '6-digit OTP code received via SMS' },
    },
  },
  response: {
    200: {
      description: 'Login successful',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                tenantId: { type: 'string', format: 'uuid' },
                centerId: { type: 'string', format: 'uuid' },
                classId: { type: ['string', 'null'], format: 'uuid', description: 'Assigned class ID for staff/teachers' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                email: { type: 'string' },
                phoneNumber: { type: 'string' },
                role: { type: 'string' },
                emailVerified: { type: 'boolean' },
                phoneVerified: { type: 'boolean' },
                profilePhotoUrl: { type: ['string', 'null'] },
                isActive: { type: 'boolean' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
            token: { type: 'string', description: 'JWT authentication token' },
            tenant: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                slug: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

export const sendOTPSchema = {
  tags: ['Authentication'],
  description: 'Send OTP to phone number (for phone verification of logged-in users)',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['phoneNumber'],
    properties: {
      phoneNumber: { type: 'string', description: 'Phone number with country code' },
    },
  },
  response: {
    200: {
      description: 'OTP sent successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const verifyOTPSchema = {
  tags: ['Authentication'],
  description: 'Verify OTP code',
  body: {
    type: 'object',
    required: ['phoneNumber', 'otp'],
    properties: {
      phoneNumber: { type: 'string', description: 'Phone number with country code' },
      otp: { type: 'string', description: 'OTP code received via SMS' },
    },
  },
  response: {
    200: {
      description: 'OTP verified successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const getCurrentUserSchema = {
  tags: ['Authentication'],
  description: 'Get current authenticated user',
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      description: 'Current user details',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string' },
                fullName: { type: 'string' },
                phoneNumber: { type: 'string' },
                role: { type: 'string' },
                tenantId: { type: 'string' },
                isActive: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  },
};

export const updateProfileSchema = {
  tags: ['Authentication'],
  description: 'Update user profile',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    properties: {
      fullName: { type: 'string', description: 'Full name' },
      phoneNumber: { type: 'string', description: 'Phone number' },
    },
  },
  response: {
    200: {
      description: 'Profile updated successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const changePasswordSchema = {
  tags: ['Authentication'],
  description: 'Change user password',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['currentPassword', 'newPassword'],
    properties: {
      currentPassword: { type: 'string', description: 'Current password' },
      newPassword: { type: 'string', minLength: 8, description: 'New password (min 8 characters)' },
    },
  },
  response: {
    200: {
      description: 'Password changed successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};
