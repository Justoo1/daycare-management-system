export const logMealSchema = {
  tags: ['Activities'],
  description: 'Log a meal activity',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['childId', 'date'],
    properties: {
      childId: { type: 'string', format: 'uuid', description: 'Child ID' },
      date: { type: 'string', format: 'date', description: 'Activity date' },
      time: { type: 'string', pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$', description: 'Activity time (HH:MM)' },
      mealType: { type: 'string', enum: ['breakfast', 'lunch', 'snack', 'dinner'], description: 'Type of meal' },
      foodItems: { type: 'string', description: 'Food items served' },
      amountConsumed: { type: 'string', enum: ['none', 'little', 'half', 'most', 'all'], description: 'Amount consumed' },
      notes: { type: 'string', description: 'Additional notes' },
    },
  },
  response: {
    201: {
      description: 'Meal logged successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const logNapSchema = {
  tags: ['Activities'],
  description: 'Log a nap activity',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['childId', 'date'],
    properties: {
      childId: { type: 'string', format: 'uuid', description: 'Child ID' },
      date: { type: 'string', format: 'date', description: 'Activity date' },
      napStartTime: { type: 'string', pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$', description: 'Nap start time (HH:MM)' },
      napEndTime: { type: 'string', pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$', description: 'Nap end time (HH:MM)' },
      napDuration: { type: 'integer', description: 'Duration in minutes' },
      napQuality: { type: 'string', enum: ['poor', 'fair', 'good', 'excellent'], description: 'Sleep quality' },
      notes: { type: 'string', description: 'Additional notes' },
    },
  },
  response: {
    201: {
      description: 'Nap logged successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const logDiaperChangeSchema = {
  tags: ['Activities'],
  description: 'Log a diaper change activity',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['childId', 'date'],
    properties: {
      childId: { type: 'string', format: 'uuid', description: 'Child ID' },
      date: { type: 'string', format: 'date', description: 'Activity date' },
      time: { type: 'string', pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$', description: 'Change time (HH:MM)' },
      diaperType: { type: 'string', enum: ['wet', 'soiled', 'both'], description: 'Type of diaper' },
      notes: { type: 'string', description: 'Additional notes' },
    },
  },
  response: {
    201: {
      description: 'Diaper change logged successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const logLearningActivitySchema = {
  tags: ['Activities'],
  description: 'Log a learning activity',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['childId', 'date'],
    properties: {
      childId: { type: 'string', format: 'uuid', description: 'Child ID' },
      date: { type: 'string', format: 'date', description: 'Activity date' },
      time: { type: 'string', pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$', description: 'Activity time (HH:MM)' },
      activityName: { type: 'string', description: 'Name of activity' },
      activityDescription: { type: 'string', description: 'Description of activity' },
      skillsDeveloped: { type: 'string', description: 'Skills developed' },
      participationLevel: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Participation level' },
      photoUrls: { type: 'array', items: { type: 'string' }, description: 'Activity photos' },
      notes: { type: 'string', description: 'Additional notes' },
    },
  },
  response: {
    201: {
      description: 'Learning activity logged successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const getActivityByIdSchema = {
  tags: ['Activities'],
  description: 'Get activity by ID with related data',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid', description: 'Activity ID' },
    },
  },
  response: {
    200: {
      description: 'Activity details',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            activity: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
    404: {
      description: 'Activity not found',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const getDailyActivitiesSchema = {
  tags: ['Activities'],
  description: 'Get daily activities for a child',
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
      date: { type: 'string', format: 'date', description: 'Date (defaults to today)' },
    },
  },
  response: {
    200: {
      description: 'Daily activities',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            activities: { type: 'array', items: { type: 'object', additionalProperties: true } },
            count: { type: 'integer' },
          },
        },
      },
    },
  },
};

export const getDailyReportSchema = {
  tags: ['Activities'],
  description: 'Get comprehensive daily report for a child',
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
      date: { type: 'string', format: 'date', description: 'Date (defaults to today)' },
    },
  },
  response: {
    200: {
      description: 'Comprehensive daily report',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            report: {
              type: 'object',
              properties: {
                child: { type: 'object' },
                attendance: { type: 'object' },
                meals: { type: 'array', items: { type: 'object', additionalProperties: true } },
                naps: { type: 'array', items: { type: 'object', additionalProperties: true } },
                diaperChanges: { type: 'array', items: { type: 'object', additionalProperties: true } },
                learningActivities: { type: 'array', items: { type: 'object', additionalProperties: true } },
                mood: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};
