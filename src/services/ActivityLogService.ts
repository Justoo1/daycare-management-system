import { AppDataSource } from '@config/database';
import { ActivityLog } from '@models/ActivityLog';
import { MealStatus } from '@shared';
import { Repository } from 'typeorm';

export class ActivityLogService {
  private activityLogRepository: Repository<ActivityLog>;

  constructor() {
    this.activityLogRepository = AppDataSource.getRepository(ActivityLog);
  }

  /**
   * Log meal activity
   */
  async logMeal(
    tenantId: string,
    centerId: string,
    childId: string,
    data: {
      date: Date;
      time: string;
      mealType: string; // 'breakfast', 'lunch', 'snack'
      mealStatus: MealStatus;
      foodItems?: string[];
      recordedByUserId?: string;
      notes?: string;
    }
  ): Promise<ActivityLog> {
    const activity = this.activityLogRepository.create({
      tenantId,
      centerId,
      childId,
      date: data.date,
      time: data.time,
      activityType: 'meal',
      mealType: data.mealType,
      mealStatus: data.mealStatus,
      foodItems: data.foodItems,
      recordedByUserId: data.recordedByUserId,
      description: data.notes,
      isVisibleToParents: true,
    });

    return this.activityLogRepository.save(activity);
  }

  /**
   * Log nap/sleep activity
   */
  async logNap(
    tenantId: string,
    centerId: string,
    childId: string,
    data: {
      date: Date;
      time: string;
      napDurationMinutes: number;
      napQuality: string;
      recordedByUserId?: string;
      notes?: string;
    }
  ): Promise<ActivityLog> {
    const activity = this.activityLogRepository.create({
      tenantId,
      centerId,
      childId,
      date: data.date,
      time: data.time,
      activityType: 'nap',
      napDurationMinutes: data.napDurationMinutes,
      napQuality: data.napQuality,
      recordedByUserId: data.recordedByUserId,
      description: data.notes,
      isVisibleToParents: true,
    });

    return this.activityLogRepository.save(activity);
  }

  /**
   * Log diaper change
   */
  async logDiaperChange(
    tenantId: string,
    centerId: string,
    childId: string,
    data: {
      date: Date;
      time: string;
      diaperType: string; // 'wet', 'soiled', 'both'
      recordedByUserId?: string;
      notes?: string;
    }
  ): Promise<ActivityLog> {
    const activity = this.activityLogRepository.create({
      tenantId,
      centerId,
      childId,
      date: data.date,
      time: data.time,
      activityType: 'diaper',
      diaperType: data.diaperType,
      recordedByUserId: data.recordedByUserId,
      description: data.notes,
      isVisibleToParents: true,
    });

    return this.activityLogRepository.save(activity);
  }

  /**
   * Log learning activity
   */
  async logLearningActivity(
    tenantId: string,
    centerId: string,
    childId: string,
    data: {
      date: Date;
      time: string;
      skillsPracticed?: string[];
      materialsUsed?: string[];
      learningAreas?: string;
      photoUrls?: string[];
      recordedByUserId?: string;
      description?: string;
    }
  ): Promise<ActivityLog> {
    const activity = this.activityLogRepository.create({
      tenantId,
      centerId,
      childId,
      date: data.date,
      time: data.time,
      activityType: 'learning',
      skillsPracticed: data.skillsPracticed,
      materialsUsed: data.materialsUsed,
      learningAreas: data.learningAreas,
      photoUrls: data.photoUrls,
      recordedByUserId: data.recordedByUserId,
      description: data.description,
      isVisibleToParents: true,
    });

    return this.activityLogRepository.save(activity);
  }

  /**
   * Log outdoor play activity
   */
  async logOutdoorPlay(
    tenantId: string,
    centerId: string,
    childId: string,
    data: {
      date: Date;
      time: string;
      playDurationMinutes: number;
      weather?: string;
      activitiesPerformed?: string[];
      photoUrls?: string[];
      recordedByUserId?: string;
      notes?: string;
    }
  ): Promise<ActivityLog> {
    const activity = this.activityLogRepository.create({
      tenantId,
      centerId,
      childId,
      date: data.date,
      time: data.time,
      activityType: 'play',
      playDurationMinutes: data.playDurationMinutes,
      weather: data.weather,
      activitiesPerformed: data.activitiesPerformed,
      photoUrls: data.photoUrls,
      recordedByUserId: data.recordedByUserId,
      description: data.notes,
      isVisibleToParents: true,
    });

    return this.activityLogRepository.save(activity);
  }

  /**
   * Log medication administration
   */
  async logMedication(
    tenantId: string,
    centerId: string,
    childId: string,
    data: {
      date: Date;
      time: string;
      medicationName: string;
      medicationDosage: string;
      authorized: boolean;
      recordedByUserId?: string;
      notes?: string;
    }
  ): Promise<ActivityLog> {
    const activity = this.activityLogRepository.create({
      tenantId,
      centerId,
      childId,
      date: data.date,
      time: data.time,
      activityType: 'medication',
      medicationName: data.medicationName,
      medicationDosage: data.medicationDosage,
      medicationAuthorized: data.authorized,
      recordedByUserId: data.recordedByUserId,
      description: data.notes,
      isVisibleToParents: true,
    });

    return this.activityLogRepository.save(activity);
  }

  /**
   * Get activity by ID with relations
   */
  async getActivityById(
    tenantId: string,
    activityId: string
  ): Promise<ActivityLog | null> {
    return this.activityLogRepository.findOne({
      where: { id: activityId, tenantId },
      relations: ['child', 'recordedByUser'],
    });
  }

  /**
   * Get daily activities for a child
   */
  async getDailyActivities(
    tenantId: string,
    childId: string,
    date: Date
  ): Promise<ActivityLog[]> {
    // Format date as YYYY-MM-DD string for proper date-only comparison
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    return this.activityLogRepository
      .createQueryBuilder('activity')
      .where('activity.tenantId = :tenantId', { tenantId })
      .andWhere('activity.childId = :childId', { childId })
      .andWhere('DATE(activity.date) = :date', { date: dateString })
      .andWhere('activity.isVisibleToParents = :isVisible', { isVisible: true })
      .orderBy('activity.time', 'ASC')
      .getMany();
  }

  /**
   * Get activity history for a child
   */
  async getActivityHistory(
    tenantId: string,
    childId: string,
    options?: {
      skip: number;
      take: number;
      startDate?: Date;
      endDate?: Date;
      activityType?: string;
    }
  ): Promise<[ActivityLog[], number]> {
    const query = this.activityLogRepository
      .createQueryBuilder('activity')
      .where('activity.tenantId = :tenantId AND activity.childId = :childId', {
        tenantId,
        childId,
      })
      .andWhere('activity.isVisibleToParents = true');

    if (options?.startDate) {
      query.andWhere('activity.date >= :startDate', { startDate: options.startDate });
    }

    if (options?.endDate) {
      query.andWhere('activity.date <= :endDate', { endDate: options.endDate });
    }

    if (options?.activityType) {
      query.andWhere('activity.activityType = :activityType', {
        activityType: options.activityType,
      });
    }

    return query
      .orderBy('activity.date', 'DESC')
      .addOrderBy('activity.time', 'DESC')
      .skip(options?.skip || 0)
      .take(options?.take || 30)
      .getManyAndCount();
  }

  /**
   * Generate daily report for child
   */
  async generateDailyReport(
    tenantId: string,
    childId: string,
    date: Date
  ): Promise<{
    date: Date;
    meals: ActivityLog[];
    naps: ActivityLog[];
    activities: ActivityLog[];
    generalMood?: string;
    notes?: string;
  }> {
    const activities = await this.getDailyActivities(tenantId, childId, date);

    return {
      date,
      meals: activities.filter(a => a.activityType === 'meal'),
      naps: activities.filter(a => a.activityType === 'nap'),
      activities: activities.filter(a => a.activityType === 'learning' || a.activityType === 'play'),
    };
  }

  /**
   * Add mood tracking to activity
   */
  async updateMood(
    tenantId: string,
    activityId: string,
    mood: string
  ): Promise<ActivityLog> {
    const activity = await this.activityLogRepository.findOne({
      where: { id: activityId, tenantId },
    });

    if (!activity) {
      throw new Error('Activity not found');
    }

    activity.mood = mood;
    return this.activityLogRepository.save(activity);
  }

  /**
   * Notify parents about activity
   */
  async notifyParentsAboutActivity(
    tenantId: string,
    activityId: string
  ): Promise<ActivityLog> {
    const activity = await this.activityLogRepository.findOne({
      where: { id: activityId, tenantId },
    });

    if (!activity) {
      throw new Error('Activity not found');
    }

    activity.parentNotified = true;
    activity.parentNotifiedAt = new Date();

    return this.activityLogRepository.save(activity);
  }

  /**
   * Get activities with photos for a child (photo gallery)
   */
  async getPhotoGallery(
    tenantId: string,
    childId: string,
    options?: { skip: number; take: number }
  ): Promise<[ActivityLog[], number]> {
    return this.activityLogRepository
      .createQueryBuilder('activity')
      .where(
        'activity.tenantId = :tenantId AND activity.childId = :childId AND activity.isVisibleToParents = true',
        { tenantId, childId }
      )
      .andWhere('activity.photoUrls IS NOT NULL AND array_length(activity.photoUrls, 1) > 0')
      .orderBy('activity.date', 'DESC')
      .addOrderBy('activity.time', 'DESC')
      .skip(options?.skip || 0)
      .take(options?.take || 50)
      .getManyAndCount();
  }
}

let activityLogService: ActivityLogService;

export function getActivityLogService(): ActivityLogService {
  if (!activityLogService) {
    activityLogService = new ActivityLogService();
  }
  return activityLogService;
}
