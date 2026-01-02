export const generateReportSchema = {
  tags: ['Reports'],
  description: 'Generate a custom report with specified filters',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['reportType', 'reportName', 'startDate', 'endDate'],
    properties: {
      reportType: {
        type: 'string',
        enum: ['attendance', 'enrollment', 'financial', 'staff', 'custom'],
        description: 'Type of report to generate',
      },
      reportName: { type: 'string', description: 'Name for the report' },
      startDate: { type: 'string', format: 'date', description: 'Report start date' },
      endDate: { type: 'string', format: 'date', description: 'Report end date' },
      filters: {
        type: 'object',
        description: 'Additional filters (center, class, etc.)',
        additionalProperties: true,
      },
      format: {
        type: 'string',
        enum: ['json', 'csv', 'pdf', 'excel'],
        default: 'json',
        description: 'Output format for the report',
      },
    },
  },
  response: {
    201: {
      description: 'Report generated successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            report: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                reportType: { type: 'string' },
                reportName: { type: 'string' },
                startDate: { type: 'string', format: 'date' },
                endDate: { type: 'string', format: 'date' },
                format: { type: 'string' },
                data: { type: 'object' },
                summary: { type: 'object' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
  },
};

export const getReportsSchema = {
  tags: ['Reports'],
  description: 'Get all reports with optional filters',
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      reportType: {
        type: 'string',
        enum: ['attendance', 'enrollment', 'financial', 'staff', 'custom'],
        description: 'Filter by report type',
      },
      startDate: { type: 'string', format: 'date', description: 'Filter reports from this date' },
      endDate: { type: 'string', format: 'date', description: 'Filter reports until this date' },
    },
  },
  response: {
    200: {
      description: 'List of reports',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            reports: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  reportType: { type: 'string' },
                  reportName: { type: 'string' },
                  startDate: { type: 'string', format: 'date' },
                  endDate: { type: 'string', format: 'date' },
                  format: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            count: { type: 'integer' },
          },
        },
      },
    },
  },
};

export const getReportByIdSchema = {
  tags: ['Reports'],
  description: 'Get report by ID',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', description: 'Report ID' },
    },
    required: ['id'],
  },
  response: {
    200: {
      description: 'Report details',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            report: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                reportType: { type: 'string' },
                reportName: { type: 'string' },
                startDate: { type: 'string', format: 'date' },
                endDate: { type: 'string', format: 'date' },
                format: { type: 'string' },
                data: { type: 'object' },
                summary: { type: 'object' },
                filters: { type: 'object' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
  },
};

export const getRecentReportsSchema = {
  tags: ['Reports'],
  description: 'Get recent reports',
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      limit: { type: 'integer', minimum: 1, maximum: 50, default: 10, description: 'Number of reports to return' },
    },
  },
  response: {
    200: {
      description: 'Recent reports',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            reports: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  reportType: { type: 'string' },
                  reportName: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            count: { type: 'integer' },
          },
        },
      },
    },
  },
};

export const getReportStatisticsSchema = {
  tags: ['Reports'],
  description: 'Get report generation statistics',
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      description: 'Report statistics',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            statistics: {
              type: 'object',
              properties: {
                totalReports: { type: 'integer' },
                byType: { type: 'object', additionalProperties: { type: 'integer' } },
                byFormat: { type: 'object', additionalProperties: { type: 'integer' } },
                recentReports: { type: 'integer' },
              },
            },
          },
        },
      },
    },
  },
};

export const deleteReportSchema = {
  tags: ['Reports'],
  description: 'Delete a report',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', description: 'Report ID' },
    },
    required: ['id'],
  },
  response: {
    200: {
      description: 'Report deleted successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};
