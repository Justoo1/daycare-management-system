export const createMilestoneSchema = {
  tags: ['Milestones'],
  description: 'Create a developmental milestone',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['childId', 'category', 'title', 'ageExpected'],
    properties: {
      childId: { type: 'string', format: 'uuid', description: 'Child ID' },
      category: {
        type: 'string',
        enum: ['physical', 'cognitive', 'social', 'emotional', 'language'],
        description: 'Milestone category',
      },
      title: { type: 'string', description: 'Milestone title' },
      description: { type: 'string', description: 'Milestone description' },
      ageExpected: { type: 'integer', description: 'Expected age in months' },
      dateAchieved: { type: 'string', format: 'date', description: 'Date achieved' },
      notes: { type: 'string', description: 'Notes' },
      photoUrls: { type: 'array', items: { type: 'string' }, description: 'Photo URLs' },
    },
  },
  response: {
    201: {
      description: 'Milestone created successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const getMilestonesByChildSchema = {
  tags: ['Milestones'],
  description: 'Get milestones for a child',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['childId'],
    properties: {
      childId: { type: 'string', format: 'uuid', description: 'Child ID' },
    },
  },
  response: {
    200: {
      description: 'Child milestones',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            milestones: { type: 'array', items: { type: 'object', additionalProperties: true } },
            count: { type: 'integer' },
          },
        },
      },
    },
  },
};

export const createAssessmentSchema = {
  tags: ['Assessments'],
  description: 'Create a child assessment',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['childId', 'assessmentType', 'assessmentDate'],
    properties: {
      childId: { type: 'string', format: 'uuid', description: 'Child ID' },
      assessmentType: {
        type: 'string',
        enum: ['developmental', 'behavioral', 'academic', 'social'],
        description: 'Assessment type',
      },
      assessmentDate: { type: 'string', format: 'date', description: 'Assessment date' },
      overallScore: { type: 'number', minimum: 0, maximum: 100, description: 'Overall score (0-100)' },
      ratings: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Individual ratings' },
      strengths: { type: 'string', description: 'Strengths observed' },
      areasForImprovement: { type: 'string', description: 'Areas for improvement' },
      recommendations: { type: 'string', description: 'Recommendations' },
      nextAssessmentDate: { type: 'string', format: 'date', description: 'Next assessment date' },
    },
  },
  response: {
    201: {
      description: 'Assessment created successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const generateProgressReportSchema = {
  tags: ['Progress Reports'],
  description: 'Generate a progress report for a child',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['childId', 'reportPeriod', 'startDate', 'endDate'],
    properties: {
      childId: { type: 'string', format: 'uuid', description: 'Child ID' },
      reportPeriod: { type: 'string', description: 'Report period (e.g., "Q1 2025")' },
      startDate: { type: 'string', format: 'date', description: 'Period start date' },
      endDate: { type: 'string', format: 'date', description: 'Period end date' },
      teacherComments: { type: 'string', description: 'Teacher comments' },
      behaviorRating: { type: 'integer', minimum: 1, maximum: 5, description: 'Behavior rating (1-5)' },
      socialSkillsRating: { type: 'integer', minimum: 1, maximum: 5, description: 'Social skills rating (1-5)' },
      academicProgress: { type: 'string', description: 'Academic progress notes' },
    },
  },
  response: {
    201: {
      description: 'Progress report generated successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            report: { type: 'object' },
          },
        },
      },
    },
  },
};
