import { FastifyRequest, FastifyReply } from 'fastify';
import { getActivityLogService } from '@services/ActivityLogService';
import { getChildService } from '@services/ChildService';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError, sendPaginatedSuccess, sendForbidden } from '@utils/response';
import { TenantContext } from '@shared';

/**
 * Validates that the staff member can perform actions on a child.
 * Staff with only VIEW_CLASS_CHILDREN permission can only access children in their assigned class.
 * Managers (super_admin, center_owner, director) can access all children.
 *
 * @returns Error message if validation fails, null if validation passes
 */
async function validateChildAccess(
  tenant: TenantContext,
  childId: string
): Promise<string | null> {
  // Managers can access all children
  const isManager = ['super_admin', 'center_owner', 'director'].includes(tenant.role);
  if (isManager) {
    return null;
  }

  // Staff without an assigned class cannot log activities
  if (!tenant.classId) {
    return 'You must be assigned to a class before you can log activities';
  }

  // Check if the child belongs to the staff's assigned class
  const childService = getChildService();
  const child = await childService.getChildById(tenant.tenantId, childId);

  if (!child) {
    return 'Child not found';
  }

  // Check if child's class matches staff's assigned class
  const childClassId = child.class?.id || (child as any).classId;
  if (childClassId !== tenant.classId) {
    return 'You can only log activities for children in your assigned class';
  }

  return null;
}

export class ActivityLogController {
  /**
   * Log a meal activity
   * POST /api/activities/meal
   */
  static async logMeal(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const activityLogService = getActivityLogService();

      const {
        centerId,
        childId,
        date,
        time,
        mealType,
        mealStatus,
        foodItems,
        recordedByUserId,
        notes,
        photoUrls,
      } = request.body as any;

      if (!centerId || !childId || !date || !time || !mealType || !mealStatus) {
        return sendBadRequest(reply, 'Missing required fields: centerId, childId, date, time, mealType, mealStatus');
      }

      // Validate staff can access this child
      const accessError = await validateChildAccess(tenant, childId);
      if (accessError) {
        return sendForbidden(reply, accessError);
      }

      const activity = await activityLogService.logMeal(tenant.tenantId, centerId, childId, {
        date: new Date(date),
        time,
        mealType,
        mealStatus,
        foodItems,
        recordedByUserId,
        notes,
        photoUrls,
      });

      return sendCreated(reply, { activity }, 'Meal activity logged successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Log a nap/sleep activity
   * POST /api/activities/nap
   */
  static async logNap(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const activityLogService = getActivityLogService();

      const {
        centerId,
        childId,
        date,
        time,
        napDurationMinutes,
        napQuality,
        recordedByUserId,
        notes,
        photoUrls,
      } = request.body as any;

      if (!centerId || !childId || !date || !time || !napDurationMinutes) {
        return sendBadRequest(reply, 'Missing required fields: centerId, childId, date, time, napDurationMinutes');
      }

      // Validate staff can access this child
      const accessError = await validateChildAccess(tenant, childId);
      if (accessError) {
        return sendForbidden(reply, accessError);
      }

      const activity = await activityLogService.logNap(tenant.tenantId, centerId, childId, {
        date: new Date(date),
        time,
        napDurationMinutes: parseInt(napDurationMinutes),
        napQuality,
        recordedByUserId,
        notes,
        photoUrls,
      });

      return sendCreated(reply, { activity }, 'Nap activity logged successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Log a diaper change
   * POST /api/activities/diaper
   */
  static async logDiaperChange(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const activityLogService = getActivityLogService();

      const {
        centerId,
        childId,
        date,
        time,
        diaperType,
        recordedByUserId,
        notes,
        photoUrls,
      } = request.body as any;

      if (!centerId || !childId || !date || !time || !diaperType) {
        return sendBadRequest(reply, 'Missing required fields: centerId, childId, date, time, diaperType');
      }

      // Validate staff can access this child
      const accessError = await validateChildAccess(tenant, childId);
      if (accessError) {
        return sendForbidden(reply, accessError);
      }

      const activity = await activityLogService.logDiaperChange(tenant.tenantId, centerId, childId, {
        date: new Date(date),
        time,
        diaperType,
        recordedByUserId,
        notes,
        photoUrls,
      });

      return sendCreated(reply, { activity }, 'Diaper change logged successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Log a learning activity
   * POST /api/activities/learning
   */
  static async logLearningActivity(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const activityLogService = getActivityLogService();

      const {
        centerId,
        childId,
        date,
        time,
        skillsPracticed,
        materialsUsed,
        learningAreas,
        photoUrls,
        recordedByUserId,
        description,
      } = request.body as any;

      if (!centerId || !childId || !date || !time) {
        return sendBadRequest(reply, 'Missing required fields: centerId, childId, date, time');
      }

      // Validate staff can access this child
      const accessError = await validateChildAccess(tenant, childId);
      if (accessError) {
        return sendForbidden(reply, accessError);
      }

      const activity = await activityLogService.logLearningActivity(tenant.tenantId, centerId, childId, {
        date: new Date(date),
        time,
        skillsPracticed,
        materialsUsed,
        learningAreas,
        photoUrls,
        recordedByUserId,
        description,
      });

      return sendCreated(reply, { activity }, 'Learning activity logged successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Log an outdoor play activity
   * POST /api/activities/outdoor-play
   */
  static async logOutdoorPlay(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const activityLogService = getActivityLogService();

      const {
        centerId,
        childId,
        date,
        time,
        playDurationMinutes,
        weather,
        activitiesPerformed,
        photoUrls,
        recordedByUserId,
        notes,
      } = request.body as any;

      if (!centerId || !childId || !date || !time || !playDurationMinutes) {
        return sendBadRequest(reply, 'Missing required fields: centerId, childId, date, time, playDurationMinutes');
      }

      // Validate staff can access this child
      const accessError = await validateChildAccess(tenant, childId);
      if (accessError) {
        return sendForbidden(reply, accessError);
      }

      const activity = await activityLogService.logOutdoorPlay(tenant.tenantId, centerId, childId, {
        date: new Date(date),
        time,
        playDurationMinutes: parseInt(playDurationMinutes),
        weather,
        activitiesPerformed,
        photoUrls,
        recordedByUserId,
        notes,
      });

      return sendCreated(reply, { activity }, 'Outdoor play activity logged successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Log medication administration
   * POST /api/activities/medication
   */
  static async logMedication(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const activityLogService = getActivityLogService();

      const {
        centerId,
        childId,
        date,
        time,
        medicationName,
        medicationDosage,
        authorized,
        recordedByUserId,
        notes,
      } = request.body as any;

      if (!centerId || !childId || !date || !time || !medicationName || !medicationDosage || authorized === undefined) {
        return sendBadRequest(reply, 'Missing required fields: centerId, childId, date, time, medicationName, medicationDosage, authorized');
      }

      // Validate staff can access this child
      const accessError = await validateChildAccess(tenant, childId);
      if (accessError) {
        return sendForbidden(reply, accessError);
      }

      const activity = await activityLogService.logMedication(tenant.tenantId, centerId, childId, {
        date: new Date(date),
        time,
        medicationName,
        medicationDosage,
        authorized: authorized === true || authorized === 'true',
        recordedByUserId,
        notes,
      });

      return sendCreated(reply, { activity }, 'Medication administration logged successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get activity by ID
   * GET /api/activities/:id
   */
  static async getActivityById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const activityLogService = getActivityLogService();
      const { id } = request.params as { id: string };

      const activity = await activityLogService.getActivityById(tenant.tenantId, id);

      if (!activity) {
        return sendNotFound(reply, 'Activity not found');
      }

      // Format the response to include staff name
      const response = {
        ...activity,
        recordedByStaffName: activity.recordedByUser
          ? `${activity.recordedByUser.firstName} ${activity.recordedByUser.lastName}`
          : null,
        childName: activity.child
          ? `${activity.child.firstName} ${activity.child.lastName}`
          : null,
      };

      return sendSuccess(reply, { activity: response });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get daily activities for a child
   * GET /api/activities/children/:childId/daily
   */
  static async getDailyActivities(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const activityLogService = getActivityLogService();
      const { childId } = request.params as { childId: string };
      const { date } = request.query as { date?: string };

      const activityDate = date ? new Date(date) : new Date();

      const activities = await activityLogService.getDailyActivities(tenant.tenantId, childId, activityDate);

      return sendSuccess(reply, { activities, date: activityDate });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get activity history for a child
   * GET /api/activities/children/:childId/history
   */
  static async getActivityHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const activityLogService = getActivityLogService();
      const { childId } = request.params as { childId: string };
      const { page = '1', limit = '30', startDate, endDate, activityType } = request.query as any;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [activities, total] = await activityLogService.getActivityHistory(tenant.tenantId, childId, {
        skip,
        take: parseInt(limit),
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        activityType,
      });

      return sendPaginatedSuccess(reply, activities, {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
      });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get daily report for a child
   * GET /api/activities/children/:childId/daily-report
   */
  static async getDailyReport(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const activityLogService = getActivityLogService();
      const { childId } = request.params as { childId: string };
      const { date } = request.query as { date?: string };

      const reportDate = date ? new Date(date) : new Date();

      const report = await activityLogService.generateDailyReport(tenant.tenantId, childId, reportDate);

      return sendSuccess(reply, { report });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get enhanced daily summary for a child (for parent app)
   * GET /api/activities/children/:childId/enhanced-daily-summary
   *
   * Returns a comprehensive daily summary with:
   * - Child info and attendance
   * - Activity summary with counts
   * - Meals with consumption analysis
   * - Sleep sessions with quality metrics
   * - Bathroom/diaper changes
   * - Learning activities with skills
   * - Outdoor play time
   * - Photo highlights
   * - Teacher notes
   * - Auto-generated insights
   */
  static async getEnhancedDailySummary(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const activityLogService = getActivityLogService();
      const { childId } = request.params as { childId: string };
      const { date } = request.query as { date?: string };

      const summaryDate = date ? new Date(date) : new Date();

      const summary = await activityLogService.getEnhancedDailySummary(tenant.tenantId, childId, summaryDate);

      if (!summary) {
        return sendNotFound(reply, 'Child not found or no data available');
      }

      return sendSuccess(reply, summary);
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get weekly summary for a child (for parent app)
   * GET /api/activities/children/:childId/weekly-summary
   *
   * Returns a weekly overview with:
   * - Week date range
   * - Attendance rate and averages
   * - Meal consumption breakdown
   * - Sleep totals and averages
   * - Activity breakdown by type
   * - Skills learned
   * - Mood breakdown
   * - Photo highlights
   * - Weekly highlights
   */
  static async getWeeklySummary(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const activityLogService = getActivityLogService();
      const { childId } = request.params as { childId: string };
      const { startDate } = request.query as { startDate?: string };

      // Default to current week's Monday
      let weekStart: Date;
      if (startDate) {
        weekStart = new Date(startDate);
      } else {
        weekStart = new Date();
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
        weekStart.setDate(diff);
      }
      weekStart.setHours(0, 0, 0, 0);

      const summary = await activityLogService.getWeeklySummary(tenant.tenantId, childId, weekStart);

      if (!summary) {
        return sendNotFound(reply, 'Child not found or no data available');
      }

      return sendSuccess(reply, summary);
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get photo gallery for a child
   * GET /api/activities/children/:childId/photos
   */
  static async getPhotoGallery(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const activityLogService = getActivityLogService();
      const { childId } = request.params as { childId: string };
      const { page = '1', limit = '50' } = request.query as any;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [activities, total] = await activityLogService.getPhotoGallery(tenant.tenantId, childId, {
        skip,
        take: parseInt(limit),
      });

      // Extract photos from activities
      const photos = activities
        .filter(a => a.photoUrls && a.photoUrls.length > 0)
        .map(a => ({
          activityId: a.id,
          activityType: a.activityType,
          date: a.date,
          time: a.time,
          photoUrls: a.photoUrls,
          description: a.description,
        }));

      return sendPaginatedSuccess(reply, photos, {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
      });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Update mood for an activity
   * PATCH /api/activities/:id/mood
   */
  static async updateMood(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const activityLogService = getActivityLogService();
      const { id } = request.params as { id: string };
      const { mood } = request.body as { mood: string };

      if (!mood) {
        return sendBadRequest(reply, 'Mood is required');
      }

      const activity = await activityLogService.updateMood(tenant.tenantId, id, mood);

      return sendSuccess(reply, { activity }, 'Mood updated successfully');
    } catch (error: any) {
      if (error.message === 'Activity not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get teacher class dashboard
   * GET /api/activities/classes/:classId/dashboard
   *
   * Returns class-wide overview for teachers:
   * - Class info and attendance summary
   * - Present/absent/not checked-in children lists
   * - Quick stats (activities, meals, naps, photos)
   * - Activity timeline
   * - Children needing attention
   * - Meal status (breakfast/lunch/snack served/pending)
   * - Recent photos
   */
  static async getTeacherClassDashboard(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const activityLogService = getActivityLogService();
      const { classId } = request.params as { classId: string };
      const { date } = request.query as { date?: string };

      // Verify teacher has access to this class
      const isManager = ['super_admin', 'center_owner', 'director'].includes(tenant.role);
      if (!isManager && tenant.classId !== classId) {
        return sendForbidden(reply, 'You can only view the dashboard for your assigned class');
      }

      const dashboardDate = date ? new Date(date) : new Date();

      const dashboard = await activityLogService.getTeacherClassDashboard(
        tenant.tenantId,
        classId,
        dashboardDate
      );

      return sendSuccess(reply, dashboard);
    } catch (error: any) {
      if (error.message === 'Class not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get class activity summary for a date range
   * GET /api/activities/classes/:classId/summary
   *
   * Returns activity summary for reporting:
   * - Activity breakdown by type
   * - Activity breakdown by child
   * - Daily breakdown
   */
  static async getClassActivitySummary(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const activityLogService = getActivityLogService();
      const { classId } = request.params as { classId: string };
      const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };

      // Verify teacher has access to this class
      const isManager = ['super_admin', 'center_owner', 'director'].includes(tenant.role);
      if (!isManager && tenant.classId !== classId) {
        return sendForbidden(reply, 'You can only view reports for your assigned class');
      }

      // Default to current week if no dates provided
      let start: Date;
      let end: Date;

      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        // Default to current week (Monday to Sunday)
        end = new Date();
        start = new Date();
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
      }

      const summary = await activityLogService.getClassActivitySummary(
        tenant.tenantId,
        classId,
        start,
        end
      );

      return sendSuccess(reply, summary);
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }
}
