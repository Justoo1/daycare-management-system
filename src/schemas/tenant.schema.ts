export const registerTenantSchema = {
  tags: ['Tenants'],
  description: 'Register a new tenant organization',
  body: {
    type: 'object',
    required: ['organizationName', 'slug', 'email', 'phoneNumber', 'address'],
    properties: {
      organizationName: { type: 'string', description: 'Organization name' },
      slug: { type: 'string', pattern: '^[a-z0-9-]+$', description: 'Unique URL-friendly identifier' },
      email: { type: 'string', format: 'email', description: 'Organization email' },
      phoneNumber: { type: 'string', description: 'Contact phone number' },
      address: { type: 'string', description: 'Physical address' },
      city: { type: 'string', description: 'City' },
      region: { type: 'string', description: 'Region/State' },
      country: { type: 'string', default: 'Ghana', description: 'Country' },
    },
  },
  response: {
    201: {
      description: 'Tenant registered successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            tenant: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                organizationName: { type: 'string' },
                slug: { type: 'string' },
                email: { type: 'string' },
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

export const getTenantBySlugSchema = {
  tags: ['Tenants'],
  description: 'Get tenant by slug',
  params: {
    type: 'object',
    required: ['slug'],
    properties: {
      slug: { type: 'string', description: 'Tenant slug' },
    },
  },
  response: {
    200: {
      description: 'Tenant details',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            tenant: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                organizationName: { type: 'string' },
                slug: { type: 'string' },
                email: { type: 'string' },
                phoneNumber: { type: 'string' },
                address: { type: 'string' },
                isActive: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  },
};

export const getTenantByIdSchema = {
  tags: ['Tenants'],
  description: 'Get tenant by ID',
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid', description: 'Tenant ID' },
    },
  },
  response: {
    200: {
      description: 'Tenant details',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            tenant: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                organizationName: { type: 'string' },
                slug: { type: 'string' },
                email: { type: 'string' },
                phoneNumber: { type: 'string' },
                isActive: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  },
};
