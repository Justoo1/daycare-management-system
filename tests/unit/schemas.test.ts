/**
 * Schema Unit Tests
 *
 * Tests to ensure all Fastify schema definitions are properly structured
 * and can be imported without errors.
 */

import * as activitySchema from '../../src/schemas/activity.schema';
import * as analyticsSchema from '../../src/schemas/analytics.schema';
import * as attendanceSchema from '../../src/schemas/attendance.schema';
import * as authSchema from '../../src/schemas/auth.schema';
import * as centerSchema from '../../src/schemas/center.schema';
import * as childSchema from '../../src/schemas/child.schema';
import * as commonSchema from '../../src/schemas/common.schema';
import * as milestoneSchema from '../../src/schemas/milestone.schema';
import * as notificationSchema from '../../src/schemas/notification.schema';
import * as reportSchema from '../../src/schemas/report.schema';
import * as staffSchema from '../../src/schemas/staff.schema';
import * as tenantSchema from '../../src/schemas/tenant.schema';

describe('Activity Schema', () => {
  it('should export logMealSchema', () => {
    expect(activitySchema.logMealSchema).toBeDefined();
    expect(activitySchema.logMealSchema.body).toBeDefined();
    expect(activitySchema.logMealSchema.response).toBeDefined();
  });

  it('should export logNapSchema', () => {
    expect(activitySchema.logNapSchema).toBeDefined();
    expect(activitySchema.logNapSchema.body).toBeDefined();
  });

  it('should export logDiaperSchema', () => {
    expect(activitySchema.logDiaperSchema).toBeDefined();
    expect(activitySchema.logDiaperSchema.body).toBeDefined();
  });

  it('should export logActivityNoteSchema', () => {
    expect(activitySchema.logActivityNoteSchema).toBeDefined();
    expect(activitySchema.logActivityNoteSchema.body).toBeDefined();
  });

  it('should export getChildActivitiesSchema', () => {
    expect(activitySchema.getChildActivitiesSchema).toBeDefined();
    expect(activitySchema.getChildActivitiesSchema.params).toBeDefined();
  });

  it('should export getDailyReportSchema', () => {
    expect(activitySchema.getDailyReportSchema).toBeDefined();
    expect(activitySchema.getDailyReportSchema.params).toBeDefined();
  });
});

describe('Analytics Schema', () => {
  it('should export getAttendanceStatsSchema', () => {
    expect(analyticsSchema.getAttendanceStatsSchema).toBeDefined();
  });

  it('should export getRevenueStatsSchema', () => {
    expect(analyticsSchema.getRevenueStatsSchema).toBeDefined();
  });

  it('should export getChildrenStatsSchema', () => {
    expect(analyticsSchema.getChildrenStatsSchema).toBeDefined();
  });

  it('should export getStaffStatsSchema', () => {
    expect(analyticsSchema.getStaffStatsSchema).toBeDefined();
  });

  it('should export getCapacityStatsSchema', () => {
    expect(analyticsSchema.getCapacityStatsSchema).toBeDefined();
  });

  it('should export getActivityStatsSchema', () => {
    expect(analyticsSchema.getActivityStatsSchema).toBeDefined();
  });
});

describe('Attendance Schema', () => {
  it('should export checkInSchema', () => {
    expect(attendanceSchema.checkInSchema).toBeDefined();
    expect(attendanceSchema.checkInSchema.body).toBeDefined();
    expect(attendanceSchema.checkInSchema.body.required).toContain('childId');
  });

  it('should export checkOutSchema', () => {
    expect(attendanceSchema.checkOutSchema).toBeDefined();
    expect(attendanceSchema.checkOutSchema.body).toBeDefined();
  });

  it('should export getAttendanceByDateSchema', () => {
    expect(attendanceSchema.getAttendanceByDateSchema).toBeDefined();
    expect(attendanceSchema.getAttendanceByDateSchema.querystring).toBeDefined();
  });

  it('should export getChildAttendanceSchema', () => {
    expect(attendanceSchema.getChildAttendanceSchema).toBeDefined();
    expect(attendanceSchema.getChildAttendanceSchema.params).toBeDefined();
  });

  it('should validate date format in schema', () => {
    const schema = attendanceSchema.getAttendanceByDateSchema.querystring;
    expect(schema.properties.date.format).toBe('date');
  });
});

describe('Auth Schema', () => {
  it('should export registerSchema', () => {
    expect(authSchema.registerSchema).toBeDefined();
    expect(authSchema.registerSchema.body).toBeDefined();
    expect(authSchema.registerSchema.body.required).toContain('email');
    expect(authSchema.registerSchema.body.required).toContain('password');
  });

  it('should export loginSchema', () => {
    expect(authSchema.loginSchema).toBeDefined();
    expect(authSchema.loginSchema.body).toBeDefined();
    expect(authSchema.loginSchema.body.required).toContain('email');
  });

  it('should export forgotPasswordSchema', () => {
    expect(authSchema.forgotPasswordSchema).toBeDefined();
    expect(authSchema.forgotPasswordSchema.body).toBeDefined();
  });

  it('should export resetPasswordSchema', () => {
    expect(authSchema.resetPasswordSchema).toBeDefined();
    expect(authSchema.resetPasswordSchema.body).toBeDefined();
  });

  it('should export changePasswordSchema', () => {
    expect(authSchema.changePasswordSchema).toBeDefined();
    expect(authSchema.changePasswordSchema.body).toBeDefined();
  });

  it('should require strong password in registerSchema', () => {
    const passwordProps = authSchema.registerSchema.body.properties.password;
    expect(passwordProps.minLength).toBeGreaterThanOrEqual(8);
  });
});

describe('Center Schema', () => {
  it('should export createCenterSchema', () => {
    expect(centerSchema.createCenterSchema).toBeDefined();
    expect(centerSchema.createCenterSchema.body).toBeDefined();
  });

  it('should export updateCenterSchema', () => {
    expect(centerSchema.updateCenterSchema).toBeDefined();
    expect(centerSchema.updateCenterSchema.body).toBeDefined();
  });

  it('should export getCenterSchema', () => {
    expect(centerSchema.getCenterSchema).toBeDefined();
  });

  it('should export deleteCenterSchema', () => {
    expect(centerSchema.deleteCenterSchema).toBeDefined();
  });
});

describe('Child Schema', () => {
  it('should export createChildSchema', () => {
    expect(childSchema.createChildSchema).toBeDefined();
    expect(childSchema.createChildSchema.body).toBeDefined();
    expect(childSchema.createChildSchema.body.required).toContain('firstName');
    expect(childSchema.createChildSchema.body.required).toContain('lastName');
    expect(childSchema.createChildSchema.body.required).toContain('dateOfBirth');
  });

  it('should export updateChildSchema', () => {
    expect(childSchema.updateChildSchema).toBeDefined();
    expect(childSchema.updateChildSchema.params).toBeDefined();
    expect(childSchema.updateChildSchema.body).toBeDefined();
  });

  it('should export getChildSchema', () => {
    expect(childSchema.getChildSchema).toBeDefined();
    expect(childSchema.getChildSchema.params).toBeDefined();
  });

  it('should export getAllChildrenSchema', () => {
    expect(childSchema.getAllChildrenSchema).toBeDefined();
  });

  it('should export deleteChildSchema', () => {
    expect(childSchema.deleteChildSchema).toBeDefined();
    expect(childSchema.deleteChildSchema.params).toBeDefined();
  });

  it('should validate gender enum in createChildSchema', () => {
    const genderProp = childSchema.createChildSchema.body.properties.gender;
    expect(genderProp.enum).toContain('male');
    expect(genderProp.enum).toContain('female');
  });
});

describe('Common Schema', () => {
  it('should export commonSchemas object', () => {
    expect(commonSchema.commonSchemas).toBeDefined();
  });

  it('should define error response schema', () => {
    expect(commonSchema.commonSchemas.errorResponse).toBeDefined();
  });

  it('should define success response schema', () => {
    expect(commonSchema.commonSchemas.successResponse).toBeDefined();
  });

  it('should define pagination schema', () => {
    expect(commonSchema.commonSchemas.pagination).toBeDefined();
  });

  it('should define UUID pattern', () => {
    expect(commonSchema.commonSchemas.uuid).toBeDefined();
    expect(commonSchema.commonSchemas.uuid.type).toBe('string');
    expect(commonSchema.commonSchemas.uuid.format).toBe('uuid');
  });
});

describe('Milestone Schema', () => {
  it('should export createMilestoneSchema', () => {
    expect(milestoneSchema.createMilestoneSchema).toBeDefined();
    expect(milestoneSchema.createMilestoneSchema.body).toBeDefined();
  });

  it('should export updateMilestoneSchema', () => {
    expect(milestoneSchema.updateMilestoneSchema).toBeDefined();
    expect(milestoneSchema.updateMilestoneSchema.body).toBeDefined();
  });

  it('should export getMilestoneSchema', () => {
    expect(milestoneSchema.getMilestoneSchema).toBeDefined();
  });

  it('should export getChildMilestonesSchema', () => {
    expect(milestoneSchema.getChildMilestonesSchema).toBeDefined();
  });

  it('should export deleteMilestoneSchema', () => {
    expect(milestoneSchema.deleteMilestoneSchema).toBeDefined();
  });
});

describe('Notification Schema', () => {
  it('should export createNotificationSchema', () => {
    expect(notificationSchema.createNotificationSchema).toBeDefined();
    expect(notificationSchema.createNotificationSchema.body).toBeDefined();
  });

  it('should export getNotificationsSchema', () => {
    expect(notificationSchema.getNotificationsSchema).toBeDefined();
  });

  it('should export markAsReadSchema', () => {
    expect(notificationSchema.markAsReadSchema).toBeDefined();
  });

  it('should export markAllAsReadSchema', () => {
    expect(notificationSchema.markAllAsReadSchema).toBeDefined();
  });

  it('should export deleteNotificationSchema', () => {
    expect(notificationSchema.deleteNotificationSchema).toBeDefined();
  });
});

describe('Report Schema', () => {
  it('should export generateAttendanceReportSchema', () => {
    expect(reportSchema.generateAttendanceReportSchema).toBeDefined();
  });

  it('should export generateFinancialReportSchema', () => {
    expect(reportSchema.generateFinancialReportSchema).toBeDefined();
  });

  it('should export generateChildReportSchema', () => {
    expect(reportSchema.generateChildReportSchema).toBeDefined();
  });

  it('should export generateStaffReportSchema', () => {
    expect(reportSchema.generateStaffReportSchema).toBeDefined();
  });

  it('should export getReportSchema', () => {
    expect(reportSchema.getReportSchema).toBeDefined();
  });

  it('should export getAllReportsSchema', () => {
    expect(reportSchema.getAllReportsSchema).toBeDefined();
  });
});

describe('Staff Schema', () => {
  it('should export createStaffSchema', () => {
    expect(staffSchema.createStaffSchema).toBeDefined();
    expect(staffSchema.createStaffSchema.body).toBeDefined();
  });

  it('should export updateStaffSchema', () => {
    expect(staffSchema.updateStaffSchema).toBeDefined();
    expect(staffSchema.updateStaffSchema.body).toBeDefined();
  });

  it('should export getStaffSchema', () => {
    expect(staffSchema.getStaffSchema).toBeDefined();
  });

  it('should export getAllStaffSchema', () => {
    expect(staffSchema.getAllStaffSchema).toBeDefined();
  });

  it('should export deleteStaffSchema', () => {
    expect(staffSchema.deleteStaffSchema).toBeDefined();
  });
});

describe('Tenant Schema', () => {
  it('should export registerTenantSchema', () => {
    expect(tenantSchema.registerTenantSchema).toBeDefined();
    expect(tenantSchema.registerTenantSchema.body).toBeDefined();
    expect(tenantSchema.registerTenantSchema.body.required).toContain('organizationName');
    expect(tenantSchema.registerTenantSchema.body.required).toContain('slug');
  });

  it('should export getTenantBySlugSchema', () => {
    expect(tenantSchema.getTenantBySlugSchema).toBeDefined();
    expect(tenantSchema.getTenantBySlugSchema.params).toBeDefined();
  });

  it('should export getTenantByIdSchema', () => {
    expect(tenantSchema.getTenantByIdSchema).toBeDefined();
    expect(tenantSchema.getTenantByIdSchema.params).toBeDefined();
  });

  it('should validate slug pattern in registerTenantSchema', () => {
    const slugProp = tenantSchema.registerTenantSchema.body.properties.slug;
    expect(slugProp.pattern).toBeDefined();
  });
});

describe('Schema Structure Validation', () => {
  it('should have consistent response structure in schemas', () => {
    // Check that schemas with responses follow a consistent pattern
    const schemasWithResponses = [
      activitySchema.logMealSchema,
      authSchema.registerSchema,
      childSchema.createChildSchema,
    ];

    schemasWithResponses.forEach(schema => {
      if (schema.response && schema.response['201']) {
        expect(schema.response['201'].properties).toHaveProperty('success');
      }
    });
  });

  it('should have security defined for protected endpoints', () => {
    const protectedSchemas = [
      activitySchema.logMealSchema,
      childSchema.createChildSchema,
      attendanceSchema.checkInSchema,
    ];

    protectedSchemas.forEach(schema => {
      expect(schema.security).toBeDefined();
      expect(schema.security).toContainEqual({ bearerAuth: [] });
    });
  });

  it('should have tags for API documentation', () => {
    expect(activitySchema.logMealSchema.tags).toContain('Activities');
    expect(authSchema.loginSchema.tags).toContain('Authentication');
    expect(childSchema.createChildSchema.tags).toContain('Children');
  });
});
