export const uuidParam = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', description: 'Resource ID' },
  },
  required: ['id'],
};

export const childIdParam = {
  type: 'object',
  properties: {
    childId: { type: 'string', format: 'uuid', description: 'Child ID' },
  },
  required: ['childId'],
};

export const staffIdParam = {
  type: 'object',
  properties: {
    staffId: { type: 'string', format: 'uuid', description: 'Staff ID' },
  },
  required: ['staffId'],
};

export const centerIdParam = {
  type: 'object',
  properties: {
    centerId: { type: 'string', format: 'uuid', description: 'Center ID' },
  },
  required: ['centerId'],
};

export const classIdParam = {
  type: 'object',
  properties: {
    classId: { type: 'string', format: 'uuid', description: 'Class ID' },
  },
  required: ['classId'],
};

export const dateParam = {
  type: 'object',
  properties: {
    date: { type: 'string', format: 'date', description: 'Date in YYYY-MM-DD format' },
  },
  required: ['date'],
};

export const successResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string' },
    data: { type: 'object' },
  },
};

export const errorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: { type: 'string' },
    timestamp: { type: 'string', format: 'date-time' },
  },
};

export const paginationQuery = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1, description: 'Page number' },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20, description: 'Items per page' },
  },
};

export const dateRangeQuery = {
  type: 'object',
  required: ['startDate', 'endDate'],
  properties: {
    startDate: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
    endDate: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
  },
};

export const tenantHeader = {
  type: 'object',
  properties: {
    'x-tenant-id': { type: 'string', format: 'uuid', description: 'Tenant ID' },
  },
  required: ['x-tenant-id'],
};
