export const checkInSchema = {
  tags: ['Attendance'],
  description: 'Check-in a child',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['childId', 'centerId', 'checkInTime'],
    properties: {
      childId: { type: 'string', format: 'uuid', description: 'Child ID' },
      centerId: { type: 'string', format: 'uuid', description: 'Center ID' },
      checkInTime: { type: 'string', pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$', description: 'Check-in time (HH:MM)' },
      temperature: { type: 'number', description: 'Temperature reading' },
      healthNotes: { type: 'string', description: 'Health screening notes' },
      checkInPhotoUrl: { type: 'string', description: 'Check-in photo URL' },
      notes: { type: 'string', description: 'General notes' },
    },
  },
  response: {
    201: {
      description: 'Child checked in successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        timestamp: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            attendance: { type: 'object', additionalProperties: true },
          },
          additionalProperties: true,
        },
      },
    },
  },
};

export const checkOutSchema = {
  tags: ['Attendance'],
  description: 'Check-out a child',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['childId', 'centerId', 'checkOutTime', 'checkedOutByName', 'checkedOutByRelationship'],
    properties: {
      childId: { type: 'string', format: 'uuid', description: 'Child ID' },
      centerId: { type: 'string', format: 'uuid', description: 'Center ID' },
      checkOutTime: { type: 'string', pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$', description: 'Check-out time (HH:MM)' },
      checkedOutByName: { type: 'string', description: 'Name of person picking up' },
      checkedOutByRelationship: { type: 'string', description: 'Relationship to child' },
      checkOutPhotoUrl: { type: 'string', description: 'Check-out photo URL' },
      notes: { type: 'string', description: 'General notes' },
    },
  },
  response: {
    200: {
      description: 'Child checked out successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        timestamp: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            attendance: { type: 'object', additionalProperties: true },
          },
          additionalProperties: true,
        },
      },
    },
  },
};

export const recordAbsenceSchema = {
  tags: ['Attendance'],
  description: 'Record a child absence',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['childId', 'date'],
    properties: {
      childId: { type: 'string', format: 'uuid', description: 'Child ID' },
      date: { type: 'string', format: 'date', description: 'Absence date' },
      absenceReason: { type: 'string', description: 'Reason for absence' },
      parentNotified: { type: 'boolean', default: false, description: 'Parent notified' },
    },
  },
  response: {
    200: {
      description: 'Absence recorded successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const getAttendanceHistorySchema = {
  tags: ['Attendance'],
  description: 'Get child attendance history',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['childId'],
    properties: {
      childId: { type: 'string', format: 'uuid', description: 'Child ID' },
    },
  },
  querystring: {
    type: 'object',
    properties: {
      startDate: { type: 'string', format: 'date', description: 'Start date' },
      endDate: { type: 'string', format: 'date', description: 'End date' },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 30 },
    },
  },
  response: {
    200: {
      description: 'Attendance history',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: { type: 'object', additionalProperties: true },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
  },
};

export const getDailyAttendanceSummarySchema = {
  tags: ['Attendance'],
  description: 'Get daily attendance summary for all children',
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      date: { type: 'string', format: 'date', description: 'Date (defaults to today)' },
      centerId: { type: 'string', format: 'uuid', description: 'Filter by center' },
    },
  },
  response: {
    200: {
      description: 'Daily attendance summary',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            date: { type: 'string', format: 'date' },
            totalChildren: { type: 'integer' },
            present: { type: 'integer' },
            absent: { type: 'integer' },
            late: { type: 'integer' },
            attendanceRate: { type: 'number' },
          },
        },
      },
    },
  },
};
