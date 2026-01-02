import { FastifyRequest, FastifyReply } from 'fastify';
import { getActivityLogService } from '@services/ActivityLogService';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError, sendPaginatedSuccess } from '@utils/response';
import { TenantContext } from '@shared';

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
      } = request.body as any;

      if (!centerId || !childId || !date || !time || !mealType || !mealStatus) {
        return sendBadRequest(reply, 'Missing required fields: centerId, childId, date, time, mealType, mealStatus');
      }

      const activity = await activityLogService.logMeal(tenant.tenantId, centerId, childId, {
        date: new Date(date),
        time,
        mealType,
        mealStatus,
        foodItems,
        recordedByUserId,
        notes,
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
      } = request.body as any;

      if (!centerId || !childId || !date || !time || !napDurationMinutes) {
        return sendBadRequest(reply, 'Missing required fields: centerId, childId, date, time, napDurationMinutes');
      }

      const activity = await activityLogService.logNap(tenant.tenantId, centerId, childId, {
        date: new Date(date),
        time,
        napDurationMinutes: parseInt(napDurationMinutes),
        napQuality,
        recordedByUserId,
        notes,
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
      } = request.body as any;

      if (!centerId || !childId || !date || !time || !diaperType) {
        return sendBadRequest(reply, 'Missing required fields: centerId, childId, date, time, diaperType');
      }

      const activity = await activityLogService.logDiaperChange(tenant.tenantId, centerId, childId, {
        date: new Date(date),
        time,
        diaperType,
        recordedByUserId,
        notes,
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
}
