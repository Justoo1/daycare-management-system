export const createCenterSchema = {
  tags: ['Centers'],
  description: 'Create a new daycare center',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['name', 'address', 'phoneNumber', 'email', 'registrationNumber', 'operatingHoursStart', 'operatingHoursEnd'],
    properties: {
      name: { type: 'string', description: 'Center name' },
      address: { type: 'string', description: 'Physical address' },
      city: { type: 'string', description: 'City' },
      region: { type: 'string', description: 'Region' },
      phoneNumber: { type: 'string', description: 'Contact phone number' },
      email: { type: 'string', format: 'email', description: 'Contact email' },
      capacity: { type: 'integer', minimum: 1, description: 'Maximum capacity' },
      registrationNumber: { type: 'string', description: 'Registration number' },
      operatingHoursStart: { type: 'string', format: 'time', description: 'Opening time (HH:MM:SS format)' },
      operatingHoursEnd: { type: 'string', format: 'time', description: 'Closing time (HH:MM:SS format)' },
    },
  },
  response: {
    201: {
      description: 'Center created successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const getCentersSchema = {
  tags: ['Centers'],
  description: 'Get all centers',
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      isActive: { type: 'boolean', description: 'Filter by active status' },
    },
  },
  response: {
    200: {
      description: 'List of centers',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            centers: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: true
              }
            },
            count: { type: 'integer' },
          },
        },
      },
    },
  },
};

export const createClassSchema = {
  tags: ['Classes'],
  description: 'Create a new class',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['centerId', 'name', 'ageGroupMin', 'ageGroupMax', 'capacity'],
    properties: {
      centerId: { type: 'string', format: 'uuid', description: 'Center ID' },
      name: { type: 'string', description: 'Class name' },
      ageGroupMin: { type: 'integer', minimum: 0, description: 'Minimum age in months' },
      ageGroupMax: { type: 'integer', minimum: 0, description: 'Maximum age in months' },
      capacity: { type: 'integer', minimum: 1, description: 'Maximum capacity' },
      room: { type: 'string', description: 'Room number/name' },
      schedule: { type: 'string', description: 'Class schedule' },
    },
  },
  response: {
    201: {
      description: 'Class created successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const getClassesSchema = {
  tags: ['Classes'],
  description: 'Get all classes',
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      centerId: { type: 'string', format: 'uuid', description: 'Filter by center' },
      isActive: { type: 'boolean', description: 'Filter by active status' },
    },
  },
  response: {
    200: {
      description: 'List of classes',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            classes: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: true
              }
            },
            count: { type: 'integer' },
          },
        },
      },
    },
  },
};
