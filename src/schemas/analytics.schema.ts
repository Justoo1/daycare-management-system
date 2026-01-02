export const getAttendanceTrendsSchema = {
  tags: ['Analytics'],
  description: 'Get attendance trends over time with peak/lowest day analysis',
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    required: ['startDate', 'endDate'],
    properties: {
      startDate: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
      endDate: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
      groupBy: {
        type: 'string',
        enum: ['day', 'week', 'month'],
        default: 'day',
        description: 'Group trends by time period'
      },
    },
  },
  response: {
    200: {
      description: 'Attendance trends with summary statistics',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            trends: {
              type: 'object',
              properties: {
                trends: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      period: { type: 'string' },
                      present: { type: 'integer' },
                      absent: { type: 'integer' },
                      late: { type: 'integer' },
                      total: { type: 'integer' },
                      attendanceRate: { type: 'number' },
                    },
                  },
                },
                summary: {
                  type: 'object',
                  properties: {
                    totalPresent: { type: 'integer' },
                    totalAbsent: { type: 'integer' },
                    totalLate: { type: 'integer' },
                    overallRate: { type: 'number' },
                    peakDay: { type: 'string' },
                    lowestDay: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const getAttendanceByClassSchema = {
  tags: ['Analytics'],
  description: 'Get attendance statistics by class',
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    required: ['startDate', 'endDate'],
    properties: {
      startDate: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
      endDate: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
    },
  },
  response: {
    200: {
      description: 'Attendance data grouped by class',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  className: { type: 'string' },
                  present: { type: 'integer' },
                  absent: { type: 'integer' },
                  late: { type: 'integer' },
                  attendanceRate: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const getEnrollmentTrendsSchema = {
  tags: ['Analytics'],
  description: 'Get enrollment trends over time',
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    required: ['startDate', 'endDate'],
    properties: {
      startDate: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
      endDate: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
    },
  },
  response: {
    200: {
      description: 'Enrollment trends by month',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            trends: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  month: { type: 'string' },
                  enrollments: { type: 'integer' },
                  withdrawals: { type: 'integer' },
                  netChange: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const getEnrollmentDemographicsSchema = {
  tags: ['Analytics'],
  description: 'Get enrollment demographics (age, gender, status distribution)',
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      description: 'Demographic breakdown of enrolled children',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            demographics: {
              type: 'object',
              properties: {
                byGender: { type: 'object', additionalProperties: { type: 'integer' } },
                byAgeGroup: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      ageGroup: { type: 'string' },
                      count: { type: 'integer' },
                    },
                  },
                },
                byStatus: { type: 'object', additionalProperties: { type: 'integer' } },
                totalChildren: { type: 'integer' },
              },
            },
          },
        },
      },
    },
  },
};

export const getRetentionRateSchema = {
  tags: ['Analytics'],
  description: 'Get retention rate for a time period',
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    required: ['startDate', 'endDate'],
    properties: {
      startDate: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
      endDate: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
    },
  },
  response: {
    200: {
      description: 'Retention rate statistics',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            retention: {
              type: 'object',
              properties: {
                totalAtStart: { type: 'integer' },
                totalAtEnd: { type: 'integer' },
                newEnrollments: { type: 'integer' },
                withdrawals: { type: 'integer' },
                retentionRate: { type: 'number' },
              },
            },
          },
        },
      },
    },
  },
};

export const getStaffAnalyticsSchema = {
  tags: ['Analytics'],
  description: 'Get staff analytics and performance metrics',
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    required: ['startDate', 'endDate'],
    properties: {
      startDate: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
      endDate: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
    },
  },
  response: {
    200: {
      description: 'Staff analytics including attendance and hours worked',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            analytics: {
              type: 'object',
              properties: {
                totalStaff: { type: 'integer' },
                averageAttendanceRate: { type: 'number' },
                totalHoursWorked: { type: 'number' },
                averageHoursPerStaff: { type: 'number' },
                overtimeHours: { type: 'number' },
                byPosition: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      position: { type: 'string' },
                      count: { type: 'integer' },
                      attendanceRate: { type: 'number' },
                      averageHours: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const getDashboardSummarySchema = {
  tags: ['Analytics'],
  description: 'Get comprehensive dashboard summary with real-time statistics',
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      description: 'Dashboard summary with key metrics',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            summary: {
              type: 'object',
              properties: {
                totalChildren: { type: 'integer' },
                enrolledChildren: { type: 'integer' },
                waitlistChildren: { type: 'integer' },
                totalStaff: { type: 'integer' },
                activeStaff: { type: 'integer' },
                todayAttendance: {
                  type: 'object',
                  properties: {
                    present: { type: 'integer' },
                    absent: { type: 'integer' },
                    late: { type: 'integer' },
                    rate: { type: 'number' },
                  },
                },
                thisWeekAttendance: {
                  type: 'object',
                  properties: {
                    present: { type: 'integer' },
                    absent: { type: 'integer' },
                    rate: { type: 'number' },
                  },
                },
                staffAttendanceToday: {
                  type: 'object',
                  properties: {
                    present: { type: 'integer' },
                    absent: { type: 'integer' },
                    rate: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
