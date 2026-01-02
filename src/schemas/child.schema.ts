export const createChildSchema = {
  tags: ['Children'],
  description: 'Create a new child profile',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['firstName', 'lastName', 'dateOfBirth', 'gender'],
    properties: {
      firstName: { type: 'string', description: 'Child first name' },
      lastName: { type: 'string', description: 'Child last name' },
      middleName: { type: 'string', description: 'Child middle name' },
      dateOfBirth: { type: 'string', format: 'date', description: 'Date of birth (YYYY-MM-DD)' },
      gender: { type: 'string', description: 'Gender' },
      bloodGroup: { type: 'string', description: 'Blood group' },
      allergies: { type: 'string', description: 'Known allergies' },
      medicalConditions: { type: 'string', description: 'Medical conditions' },
      photoUrl: { type: 'string', description: 'Profile photo URL' },
      classId: { type: 'string', format: 'uuid', description: 'Assigned class ID' },
    },
  },
  response: {
    201: {
      description: 'Child created successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            child: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                dateOfBirth: { type: 'string', format: 'date' },
                enrollmentStatus: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
  },
};

export const listChildrenSchema = {
  tags: ['Children'],
  description: 'List all children with optional filters',
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      enrollmentStatus: { type: 'string', enum: ['ENROLLED', 'WAITLIST', 'PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'] },
      classId: { type: 'string', format: 'uuid' },
      centerId: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    200: {
      description: 'Paginated list of children',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: { type: 'object', additionalProperties: true }
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
        timestamp: { type: 'string' },
      },
    },
  },
};

export const getChildSchema = {
  tags: ['Children'],
  description: 'Get child by ID',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid', description: 'Child ID' },
    },
  },
  response: {
    200: {
      description: 'Child details',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            child: { type: 'object', additionalProperties: true },
          },
        },
        timestamp: { type: 'string' },
      },
    },
  },
};

export const enrollChildSchema = {
  tags: ['Children'],
  description: 'Enroll a child',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['childId'],
    properties: {
      childId: { type: 'string', format: 'uuid', description: 'Child ID' },
    },
  },
  body: {
    type: 'object',
    properties: {
      enrollmentDate: { type: 'string', format: 'date', description: 'Enrollment date' },
      classId: { type: 'string', format: 'uuid', description: 'Class ID' },
    },
  },
  response: {
    200: {
      description: 'Child enrolled successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const addGuardianSchema = {
  tags: ['Guardians'],
  description: 'Add guardian to child',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['childId'],
    properties: {
      childId: { type: 'string', format: 'uuid', description: 'Child ID' },
    },
  },
  body: {
    type: 'object',
    required: ['firstName', 'lastName', 'relationship', 'phoneNumber', 'email', 'centerId'],
    properties: {
      centerId: { type: 'string', format: 'uuid', description: 'Center ID' },
      firstName: { type: 'string', description: 'Guardian first name' },
      lastName: { type: 'string', description: 'Guardian last name' },
      relationship: { type: 'string', description: 'Relationship to child' },
      phoneNumber: { type: 'string', description: 'Phone number' },
      email: { type: 'string', format: 'email', description: 'Email address' },
      occupation: { type: 'string', description: 'Occupation' },
      company: { type: 'string', description: 'Company name' },
      workAddress: { type: 'string', description: 'Work address' },
      workPhoneNumber: { type: 'string', description: 'Work phone number' },
      residentialAddress: { type: 'string', description: 'Residential address' },
      city: { type: 'string', description: 'City' },
      region: { type: 'string', description: 'Region/State' },
      postalCode: { type: 'string', description: 'Postal code' },
      isPrimaryGuardian: { type: 'boolean', default: false, description: 'Primary guardian' },
      isAuthorizedPickup: { type: 'boolean', default: true, description: 'Authorized for pickup' },
      canReceiveSMS: { type: 'boolean', default: true, description: 'Can receive SMS' },
      canReceiveEmail: { type: 'boolean', default: true, description: 'Can receive email' },
      canReceivePushNotifications: { type: 'boolean', default: true, description: 'Can receive push notifications' },
    },
  },
  response: {
    201: {
      description: 'Guardian added successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            guardian: { type: 'object', additionalProperties: true },
          },
        },
        timestamp: { type: 'string' },
      },
    },
  },
};
