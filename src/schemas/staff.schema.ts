export const createStaffProfileSchema = {
  tags: ['Staff'],
  description: 'Create a new staff profile',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['userId', 'centerId', 'employeeId', 'position', 'hireDate'],
    properties: {
      userId: { type: 'string', format: 'uuid', description: 'User ID' },
      centerId: { type: 'string', format: 'uuid', description: 'Center ID' },
      employeeId: { type: 'string', description: 'Employee ID' },
      position: {
        type: 'string',
        enum: ['teacher', 'assistant', 'director', 'nurse', 'cook', 'janitor', 'driver', 'admin'],
        description: 'Staff position',
      },
      department: { type: 'string', description: 'Department' },
      hireDate: { type: 'string', format: 'date', description: 'Hire date' },
      employmentType: { type: 'string', enum: ['full-time', 'part-time', 'contract'], description: 'Employment type' },
      salary: { type: 'number', description: 'Salary amount' },
      salaryFrequency: { type: 'string', enum: ['hourly', 'monthly', 'annual'], description: 'Salary frequency' },
      emergencyContactName: { type: 'string', description: 'Emergency contact name' },
      emergencyContactPhone: { type: 'string', description: 'Emergency contact phone' },
    },
  },
  response: {
    201: {
      description: 'Staff profile created successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const getAllStaffSchema = {
  tags: ['Staff'],
  description: 'Get all staff members',
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      centerId: { type: 'string', format: 'uuid', description: 'Filter by center' },
      position: { type: 'string', description: 'Filter by position' },
      isActive: { type: 'boolean', description: 'Filter by active status' },
    },
  },
  response: {
    200: {
      description: 'List of staff members',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            staff: { type: 'array', items: { type: 'object', additionalProperties: true } },
            count: { type: 'integer' },
          },
        },
      },
    },
  },
};

export const createCertificationSchema = {
  tags: ['Certifications'],
  description: 'Add certification for staff member',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['staffId', 'certificationType', 'issuingOrganization', 'issueDate'],
    properties: {
      staffId: { type: 'string', format: 'uuid', description: 'Staff ID' },
      certificationType: { type: 'string', description: 'Type of certification (e.g., CPR, First Aid)' },
      issuingOrganization: { type: 'string', description: 'Issuing organization' },
      issueDate: { type: 'string', format: 'date', description: 'Issue date' },
      expiryDate: { type: 'string', format: 'date', description: 'Expiry date' },
      certificateNumber: { type: 'string', description: 'Certificate number' },
      documentUrl: { type: 'string', description: 'Document URL' },
    },
  },
  response: {
    201: {
      description: 'Certification added successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const getExpiringCertificationsSchema = {
  tags: ['Certifications'],
  description: 'Get certifications expiring soon',
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      days: { type: 'integer', default: 30, description: 'Days until expiry' },
    },
  },
  response: {
    200: {
      description: 'Expiring certifications',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            certifications: { type: 'array', items: { type: 'object', additionalProperties: true } },
            count: { type: 'integer' },
          },
        },
      },
    },
  },
};

export const createShiftSchema = {
  tags: ['Shifts'],
  description: 'Create a staff shift',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['staffId', 'centerId', 'shiftDate', 'startTime', 'endTime'],
    properties: {
      staffId: { type: 'string', format: 'uuid', description: 'Staff ID' },
      centerId: { type: 'string', format: 'uuid', description: 'Center ID' },
      classId: { type: 'string', format: 'uuid', description: 'Class ID (optional)' },
      shiftDate: { type: 'string', format: 'date', description: 'Shift date' },
      startTime: { type: 'string', pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$', description: 'Start time (HH:MM)' },
      endTime: { type: 'string', pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$', description: 'End time (HH:MM)' },
      breakDuration: { type: 'integer', description: 'Break duration in minutes' },
      notes: { type: 'string', description: 'Shift notes' },
    },
  },
  response: {
    201: {
      description: 'Shift created successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const recordStaffCheckInSchema = {
  tags: ['Staff Attendance'],
  description: 'Record staff check-in',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['staffId', 'attendanceDate'],
    properties: {
      staffId: { type: 'string', format: 'uuid', description: 'Staff ID' },
      attendanceDate: { type: 'string', format: 'date', description: 'Attendance date' },
      checkInTime: { type: 'string', pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$', description: 'Check-in time (HH:MM)' },
      notes: { type: 'string', description: 'Notes' },
    },
  },
  response: {
    200: {
      description: 'Staff checked in successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};
