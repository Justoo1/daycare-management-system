import { AppDataSource } from '@config/database';
import { ActivityLog } from '@models/ActivityLog';
import { Attendance } from '@models/Attendance';
import { Child } from '@models/Child';
import { MealStatus, EnrollmentStatus } from '@shared';
import { Repository } from 'typeorm';

export class ActivityLogService {
  private activityLogRepository: Repository<ActivityLog>;
  private attendanceRepository: Repository<Attendance>;
  private childRepository: Repository<Child>;

  constructor() {
    this.activityLogRepository = AppDataSource.getRepository(ActivityLog);
    this.attendanceRepository = AppDataSource.getRepository(Attendance);
    this.childRepository = AppDataSource.getRepository(Child);
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
      photoUrls?: string[];
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
      photoUrls: data.photoUrls,
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
      photoUrls?: string[];
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
      photoUrls: data.photoUrls,
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
      photoUrls?: string[];
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
      photoUrls: data.photoUrls,
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
      .andWhere("activity.photoUrls IS NOT NULL AND activity.photoUrls != ''")
      .orderBy('activity.date', 'DESC')
      .addOrderBy('activity.time', 'DESC')
      .skip(options?.skip || 0)
      .take(options?.take || 50)
      .getManyAndCount();
  }

  /**
   * Generate enhanced daily summary for parents
   * Provides aggregated data with visual-friendly metrics
   */
  async getEnhancedDailySummary(
    tenantId: string,
    childId: string,
    date: Date
  ): Promise<{
    date: string;
    child: {
      id: string;
      firstName: string;
      lastName: string;
      photoUrl?: string;
      className?: string;
    };
    attendance: {
      status: 'present' | 'absent' | 'late' | 'not_recorded';
      checkInTime?: string;
      checkOutTime?: string;
      totalHours?: number;
    };
    summary: {
      totalActivities: number;
      photoCount: number;
      dominantMood: string | null;
      moodBreakdown: Record<string, number>;
    };
    meals: {
      count: number;
      items: Array<{
        type: string;
        time: string;
        status: string;
        foodItems?: string[];
        notes?: string;
      }>;
      consumptionSummary: {
        all: number;
        most: number;
        some: number;
        none: number;
      };
    };
    sleep: {
      totalMinutes: number;
      sessions: Array<{
        time: string;
        durationMinutes: number;
        quality?: string;
        notes?: string;
      }>;
      averageQuality: string | null;
    };
    bathroom: {
      diaperChanges: number;
      details: Array<{
        time: string;
        type: string;
        notes?: string;
      }>;
    };
    learning: {
      count: number;
      activities: Array<{
        time: string;
        description?: string;
        skillsPracticed?: string[];
        learningAreas?: string;
        photoUrls?: string[];
      }>;
      skillsWorkedOn: string[];
    };
    outdoor: {
      totalMinutes: number;
      sessions: Array<{
        time: string;
        durationMinutes: number;
        activities?: string[];
        weather?: string;
        photoUrls?: string[];
      }>;
    };
    photos: {
      count: number;
      highlights: string[]; // Up to 4 photo URLs for preview
    };
    teacherNotes: string[];
    insights: string[];
  }> {
    // Format date for query
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    // Fetch child info
    const child = await this.childRepository.findOne({
      where: { id: childId, tenantId },
      relations: ['class'],
    });

    if (!child) {
      throw new Error('Child not found');
    }

    // Fetch attendance for the day
    const attendance = await this.attendanceRepository.findOne({
      where: {
        childId,
        tenantId,
        date: new Date(dateString),
      },
    });

    // Fetch all activities for the day
    const activities = await this.activityLogRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.recordedByUser', 'user')
      .where('activity.tenantId = :tenantId', { tenantId })
      .andWhere('activity.childId = :childId', { childId })
      .andWhere('DATE(activity.date) = :date', { date: dateString })
      .andWhere('activity.isVisibleToParents = :isVisible', { isVisible: true })
      .orderBy('activity.time', 'ASC')
      .getMany();

    // Categorize activities
    const meals = activities.filter(a => a.activityType === 'meal');
    const naps = activities.filter(a => a.activityType === 'nap');
    const diapers = activities.filter(a => a.activityType === 'diaper');
    const learning = activities.filter(a => a.activityType === 'learning');
    const outdoor = activities.filter(a => a.activityType === 'play' || a.activityType === 'outdoor_play');

    // Calculate mood breakdown
    const moodBreakdown: Record<string, number> = {};
    activities.forEach(a => {
      if (a.mood) {
        moodBreakdown[a.mood] = (moodBreakdown[a.mood] || 0) + 1;
      }
    });
    const dominantMood = Object.keys(moodBreakdown).length > 0
      ? Object.entries(moodBreakdown).sort((a, b) => b[1] - a[1])[0][0]
      : null;

    // Calculate meal consumption summary
    const consumptionSummary = { all: 0, most: 0, some: 0, none: 0 };
    meals.forEach(m => {
      const status = m.mealStatus?.toLowerCase() || 'unknown';
      if (status === 'all') consumptionSummary.all++;
      else if (status === 'most') consumptionSummary.most++;
      else if (status === 'some') consumptionSummary.some++;
      else if (status === 'none') consumptionSummary.none++;
    });

    // Calculate total sleep and average quality
    const totalSleepMinutes = naps.reduce((sum, n) => sum + (n.napDurationMinutes || 0), 0);
    const napQualities = naps.filter(n => n.napQuality).map(n => n.napQuality!);
    const qualityScores: Record<string, number> = { excellent: 4, good: 3, fair: 2, poor: 1 };
    const avgQualityScore = napQualities.length > 0
      ? napQualities.reduce((sum, q) => sum + (qualityScores[q.toLowerCase()] || 2), 0) / napQualities.length
      : null;
    const averageQuality = avgQualityScore !== null
      ? avgQualityScore >= 3.5 ? 'Excellent' : avgQualityScore >= 2.5 ? 'Good' : avgQualityScore >= 1.5 ? 'Fair' : 'Poor'
      : null;

    // Collect all photos
    const allPhotos: string[] = [];
    activities.forEach(a => {
      if (a.photoUrls && a.photoUrls.length > 0) {
        allPhotos.push(...a.photoUrls);
      }
    });

    // Collect skills worked on
    const skillsWorkedOn = new Set<string>();
    learning.forEach(l => {
      if (l.skillsPracticed) {
        l.skillsPracticed.forEach(s => skillsWorkedOn.add(s));
      }
    });

    // Collect teacher notes
    const teacherNotes: string[] = [];
    activities.forEach(a => {
      if (a.description && a.description.trim()) {
        teacherNotes.push(a.description);
      }
    });

    // Calculate total outdoor time
    const totalOutdoorMinutes = outdoor.reduce((sum, o) => sum + (o.playDurationMinutes || 0), 0);

    // Generate insights
    const insights: string[] = [];

    // Attendance insight
    if (attendance?.status === 'present') {
      insights.push('Had a full day at the center');
    } else if (attendance?.status === 'late') {
      insights.push('Arrived late today');
    }

    // Meal insights
    if (consumptionSummary.all >= 2) {
      insights.push('Ate well today - finished most meals');
    } else if (consumptionSummary.none >= 2) {
      insights.push('Appetite was lower than usual today');
    }

    // Sleep insights
    if (totalSleepMinutes >= 120) {
      insights.push('Got plenty of rest today');
    } else if (totalSleepMinutes > 0 && totalSleepMinutes < 60) {
      insights.push('Had a shorter nap than usual');
    }

    // Mood insights
    if (dominantMood === 'happy' || dominantMood === 'playful') {
      insights.push('Was in great spirits today');
    } else if (dominantMood === 'fussy' || dominantMood === 'cranky') {
      insights.push('Had some fussy moments today');
    }

    // Learning insights
    if (learning.length >= 2) {
      insights.push('Participated in multiple learning activities');
    }

    // Outdoor insights
    if (totalOutdoorMinutes >= 30) {
      insights.push('Enjoyed outdoor playtime');
    }

    // Calculate attendance hours
    let totalHours: number | undefined;
    if (attendance?.checkInTime && attendance?.checkOutTime) {
      const checkIn = new Date(`${dateString}T${attendance.checkInTime}`);
      const checkOut = new Date(`${dateString}T${attendance.checkOutTime}`);
      totalHours = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60) * 10) / 10;
    }

    return {
      date: dateString,
      child: {
        id: child.id,
        firstName: child.firstName,
        lastName: child.lastName,
        photoUrl: child.photoUrl || undefined,
        className: child.class?.name,
      },
      attendance: {
        status: attendance?.status as any || 'not_recorded',
        checkInTime: attendance?.checkInTime || undefined,
        checkOutTime: attendance?.checkOutTime || undefined,
        totalHours,
      },
      summary: {
        totalActivities: activities.length,
        photoCount: allPhotos.length,
        dominantMood,
        moodBreakdown,
      },
      meals: {
        count: meals.length,
        items: meals.map(m => ({
          type: m.mealType || 'meal',
          time: m.time,
          status: m.mealStatus || 'unknown',
          foodItems: m.foodItems,
          notes: m.description || undefined,
        })),
        consumptionSummary,
      },
      sleep: {
        totalMinutes: totalSleepMinutes,
        sessions: naps.map(n => ({
          time: n.time,
          durationMinutes: n.napDurationMinutes || 0,
          quality: n.napQuality || undefined,
          notes: n.description || undefined,
        })),
        averageQuality,
      },
      bathroom: {
        diaperChanges: diapers.length,
        details: diapers.map(d => ({
          time: d.time,
          type: d.diaperType || 'change',
          notes: d.description || undefined,
        })),
      },
      learning: {
        count: learning.length,
        activities: learning.map(l => ({
          time: l.time,
          description: l.description || undefined,
          skillsPracticed: l.skillsPracticed,
          learningAreas: l.learningAreas || undefined,
          photoUrls: l.photoUrls,
        })),
        skillsWorkedOn: Array.from(skillsWorkedOn),
      },
      outdoor: {
        totalMinutes: totalOutdoorMinutes,
        sessions: outdoor.map(o => ({
          time: o.time,
          durationMinutes: o.playDurationMinutes || 0,
          activities: o.activitiesPerformed,
          weather: o.weather || undefined,
          photoUrls: o.photoUrls,
        })),
      },
      photos: {
        count: allPhotos.length,
        highlights: allPhotos.slice(0, 4),
      },
      teacherNotes: teacherNotes.slice(0, 5), // Limit to 5 most recent notes
      insights,
    };
  }

  /**
   * Generate weekly summary for parents
   */
  async getWeeklySummary(
    tenantId: string,
    childId: string,
    startDate: Date
  ): Promise<{
    weekStart: string;
    weekEnd: string;
    child: { id: string; firstName: string; lastName: string };
    attendance: {
      daysPresent: number;
      daysAbsent: number;
      daysLate: number;
      totalDays: number;
      attendanceRate: number;
      avgArrivalTime?: string;
      avgDepartureTime?: string;
    };
    meals: {
      totalMeals: number;
      consumptionBreakdown: Record<string, number>;
      avgMealsPerDay: number;
    };
    sleep: {
      totalMinutes: number;
      avgMinutesPerDay: number;
      avgQuality: string | null;
    };
    activities: {
      totalActivities: number;
      byType: Record<string, number>;
      skillsLearned: string[];
    };
    mood: {
      dominantMood: string | null;
      breakdown: Record<string, number>;
    };
    photos: {
      count: number;
      highlights: string[];
    };
    highlights: string[];
  }> {
    // Calculate week end date (6 days after start)
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    const startString = startDate.toISOString().split('T')[0];
    const endString = endDate.toISOString().split('T')[0];

    // Fetch child
    const child = await this.childRepository.findOne({
      where: { id: childId, tenantId },
    });

    if (!child) {
      throw new Error('Child not found');
    }

    // Fetch attendance for the week
    const attendanceRecords = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .where('attendance.tenantId = :tenantId', { tenantId })
      .andWhere('attendance.childId = :childId', { childId })
      .andWhere('attendance.date >= :startDate', { startDate: startString })
      .andWhere('attendance.date <= :endDate', { endDate: endString })
      .getMany();

    const daysPresent = attendanceRecords.filter(a => a.status === 'present').length;
    const daysAbsent = attendanceRecords.filter(a => a.status === 'absent').length;
    const daysLate = attendanceRecords.filter(a => a.status === 'late').length;
    const totalDays = attendanceRecords.length;
    const attendanceRate = totalDays > 0 ? Math.round((daysPresent + daysLate) / totalDays * 100) : 0;

    // Calculate average arrival/departure times
    const arrivalTimes = attendanceRecords.filter(a => a.checkInTime).map(a => a.checkInTime!);
    const departureTimes = attendanceRecords.filter(a => a.checkOutTime).map(a => a.checkOutTime!);

    const avgArrivalTime = arrivalTimes.length > 0
      ? this.calculateAverageTime(arrivalTimes)
      : undefined;
    const avgDepartureTime = departureTimes.length > 0
      ? this.calculateAverageTime(departureTimes)
      : undefined;

    // Fetch all activities for the week
    const activities = await this.activityLogRepository
      .createQueryBuilder('activity')
      .where('activity.tenantId = :tenantId', { tenantId })
      .andWhere('activity.childId = :childId', { childId })
      .andWhere('activity.date >= :startDate', { startDate: startString })
      .andWhere('activity.date <= :endDate', { endDate: endString })
      .andWhere('activity.isVisibleToParents = true')
      .getMany();

    // Categorize activities
    const meals = activities.filter(a => a.activityType === 'meal');
    const naps = activities.filter(a => a.activityType === 'nap');

    // Meal consumption breakdown
    const consumptionBreakdown: Record<string, number> = { all: 0, most: 0, some: 0, none: 0 };
    meals.forEach(m => {
      const status = m.mealStatus?.toLowerCase() || 'unknown';
      if (consumptionBreakdown[status] !== undefined) {
        consumptionBreakdown[status]++;
      }
    });

    // Sleep stats
    const totalSleepMinutes = naps.reduce((sum, n) => sum + (n.napDurationMinutes || 0), 0);
    const avgSleepMinutes = totalDays > 0 ? Math.round(totalSleepMinutes / totalDays) : 0;

    const napQualities = naps.filter(n => n.napQuality).map(n => n.napQuality!);
    const qualityScores: Record<string, number> = { excellent: 4, good: 3, fair: 2, poor: 1 };
    const avgQualityScore = napQualities.length > 0
      ? napQualities.reduce((sum, q) => sum + (qualityScores[q.toLowerCase()] || 2), 0) / napQualities.length
      : null;
    const avgQuality = avgQualityScore !== null
      ? avgQualityScore >= 3.5 ? 'Excellent' : avgQualityScore >= 2.5 ? 'Good' : avgQualityScore >= 1.5 ? 'Fair' : 'Poor'
      : null;

    // Activity breakdown by type
    const activityByType: Record<string, number> = {};
    activities.forEach(a => {
      activityByType[a.activityType] = (activityByType[a.activityType] || 0) + 1;
    });

    // Skills learned
    const skillsLearned = new Set<string>();
    activities
      .filter(a => a.activityType === 'learning' && a.skillsPracticed)
      .forEach(a => a.skillsPracticed!.forEach(s => skillsLearned.add(s)));

    // Mood breakdown
    const moodBreakdown: Record<string, number> = {};
    activities.forEach(a => {
      if (a.mood) {
        moodBreakdown[a.mood] = (moodBreakdown[a.mood] || 0) + 1;
      }
    });
    const dominantMood = Object.keys(moodBreakdown).length > 0
      ? Object.entries(moodBreakdown).sort((a, b) => b[1] - a[1])[0][0]
      : null;

    // Photos
    const allPhotos: string[] = [];
    activities.forEach(a => {
      if (a.photoUrls && a.photoUrls.length > 0) {
        allPhotos.push(...a.photoUrls);
      }
    });

    // Generate highlights
    const highlights: string[] = [];
    if (attendanceRate >= 90) {
      highlights.push('Great attendance this week!');
    }
    if (consumptionBreakdown.all >= meals.length * 0.7) {
      highlights.push('Ate well throughout the week');
    }
    if (skillsLearned.size > 0) {
      highlights.push(`Practiced ${skillsLearned.size} different skills`);
    }
    if (allPhotos.length > 0) {
      highlights.push(`${allPhotos.length} photos captured this week`);
    }
    if (dominantMood === 'happy' || dominantMood === 'playful') {
      highlights.push('Was in great spirits most of the week');
    }

    return {
      weekStart: startString,
      weekEnd: endString,
      child: {
        id: child.id,
        firstName: child.firstName,
        lastName: child.lastName,
      },
      attendance: {
        daysPresent,
        daysAbsent,
        daysLate,
        totalDays,
        attendanceRate,
        avgArrivalTime,
        avgDepartureTime,
      },
      meals: {
        totalMeals: meals.length,
        consumptionBreakdown,
        avgMealsPerDay: totalDays > 0 ? Math.round(meals.length / totalDays * 10) / 10 : 0,
      },
      sleep: {
        totalMinutes: totalSleepMinutes,
        avgMinutesPerDay: avgSleepMinutes,
        avgQuality,
      },
      activities: {
        totalActivities: activities.length,
        byType: activityByType,
        skillsLearned: Array.from(skillsLearned),
      },
      mood: {
        dominantMood,
        breakdown: moodBreakdown,
      },
      photos: {
        count: allPhotos.length,
        highlights: allPhotos.slice(0, 6),
      },
      highlights,
    };
  }

  /**
   * Helper to calculate average time from array of time strings
   */
  private calculateAverageTime(times: string[]): string {
    const totalMinutes = times.reduce((sum, time) => {
      const [hours, minutes] = time.split(':').map(Number);
      return sum + hours * 60 + minutes;
    }, 0);
    const avgMinutes = Math.round(totalMinutes / times.length);
    const hours = Math.floor(avgMinutes / 60);
    const mins = avgMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  /**
   * Get teacher class dashboard data
   * Provides class-wide overview for teachers
   */
  async getTeacherClassDashboard(
    tenantId: string,
    classId: string,
    date: Date
  ): Promise<{
    date: string;
    classInfo: {
      id: string;
      name: string;
      capacity: number;
      totalChildren: number;
    };
    attendance: {
      present: number;
      absent: number;
      late: number;
      notRecorded: number;
      presentChildren: Array<{
        id: string;
        firstName: string;
        lastName: string;
        photoUrl?: string;
        checkInTime?: string;
      }>;
      absentChildren: Array<{
        id: string;
        firstName: string;
        lastName: string;
        photoUrl?: string;
      }>;
      notCheckedIn: Array<{
        id: string;
        firstName: string;
        lastName: string;
        photoUrl?: string;
      }>;
    };
    quickStats: {
      activitiesLogged: number;
      mealsServed: number;
      napsRecorded: number;
      diaperChanges: number;
      photosCapture: number;
    };
    activityTimeline: Array<{
      id: string;
      time: string;
      activityType: string;
      childName: string;
      childId: string;
      description?: string;
      photoUrls?: string[];
    }>;
    needsAttention: Array<{
      childId: string;
      childName: string;
      photoUrl?: string;
      reason: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    mealStatus: {
      breakfast: { served: number; pending: number };
      lunch: { served: number; pending: number };
      snack: { served: number; pending: number };
    };
    recentPhotos: Array<{
      url: string;
      childName: string;
      time: string;
      activityType: string;
    }>;
  }> {
    // Format date for query
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    // Import Class model
    const { Class } = await import('@models/Class');
    const classRepository = AppDataSource.getRepository(Class);

    // Fetch class info
    const classInfo = await classRepository.findOne({
      where: { id: classId, tenantId },
    });

    if (!classInfo) {
      throw new Error('Class not found');
    }

    // Fetch all children in the class
    const children = await this.childRepository.find({
      where: { classId, tenantId, enrollmentStatus: EnrollmentStatus.ENROLLED },
      select: ['id', 'firstName', 'lastName', 'photoUrl'],
    });

    const childIds = children.map(c => c.id);

    // Fetch attendance for all children today
    const attendanceRecords = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .where('attendance.tenantId = :tenantId', { tenantId })
      .andWhere('attendance.childId IN (:...childIds)', { childIds: childIds.length > 0 ? childIds : ['none'] })
      .andWhere('DATE(attendance.date) = :date', { date: dateString })
      .getMany();

    const attendanceMap = new Map(attendanceRecords.map(a => [a.childId, a]));

    // Categorize children by attendance
    const presentChildren: Array<{ id: string; firstName: string; lastName: string; photoUrl?: string; checkInTime?: string }> = [];
    const absentChildren: Array<{ id: string; firstName: string; lastName: string; photoUrl?: string }> = [];
    const notCheckedIn: Array<{ id: string; firstName: string; lastName: string; photoUrl?: string }> = [];
    let lateCount = 0;

    children.forEach(child => {
      const attendance = attendanceMap.get(child.id);
      if (!attendance) {
        notCheckedIn.push({
          id: child.id,
          firstName: child.firstName,
          lastName: child.lastName,
          photoUrl: child.photoUrl || undefined,
        });
      } else if (attendance.status === 'present' || attendance.status === 'late') {
        presentChildren.push({
          id: child.id,
          firstName: child.firstName,
          lastName: child.lastName,
          photoUrl: child.photoUrl || undefined,
          checkInTime: attendance.checkInTime || undefined,
        });
        if (attendance.status === 'late') lateCount++;
      } else if (attendance.status === 'absent') {
        absentChildren.push({
          id: child.id,
          firstName: child.firstName,
          lastName: child.lastName,
          photoUrl: child.photoUrl || undefined,
        });
      }
    });

    // Fetch all activities for the class today
    const activities = await this.activityLogRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.child', 'child')
      .where('activity.tenantId = :tenantId', { tenantId })
      .andWhere('activity.childId IN (:...childIds)', { childIds: childIds.length > 0 ? childIds : ['none'] })
      .andWhere('DATE(activity.date) = :date', { date: dateString })
      .orderBy('activity.time', 'DESC')
      .getMany();

    // Calculate quick stats
    const meals = activities.filter(a => a.activityType === 'meal');
    const naps = activities.filter(a => a.activityType === 'nap');
    const diapers = activities.filter(a => a.activityType === 'diaper');
    const allPhotos: string[] = [];
    activities.forEach(a => {
      if (a.photoUrls && a.photoUrls.length > 0) {
        allPhotos.push(...a.photoUrls);
      }
    });

    // Build activity timeline (most recent first, limit 20)
    const activityTimeline = activities.slice(0, 20).map(a => ({
      id: a.id,
      time: a.time,
      activityType: a.activityType,
      childName: a.child ? `${a.child.firstName} ${a.child.lastName}` : 'Unknown',
      childId: a.childId,
      description: a.description || undefined,
      photoUrls: a.photoUrls,
    }));

    // Calculate meal status
    const presentChildIds = new Set(presentChildren.map(c => c.id));
    const presentCount = presentChildren.length;

    const breakfastServed = new Set(meals.filter(m => m.mealType === 'breakfast').map(m => m.childId));
    const lunchServed = new Set(meals.filter(m => m.mealType === 'lunch').map(m => m.childId));
    const snackServed = new Set(meals.filter(m => m.mealType === 'snack').map(m => m.childId));

    const mealStatus = {
      breakfast: {
        served: breakfastServed.size,
        pending: Math.max(0, presentCount - breakfastServed.size),
      },
      lunch: {
        served: lunchServed.size,
        pending: Math.max(0, presentCount - lunchServed.size),
      },
      snack: {
        served: snackServed.size,
        pending: Math.max(0, presentCount - snackServed.size),
      },
    };

    // Identify children needing attention
    const needsAttention: Array<{
      childId: string;
      childName: string;
      photoUrl?: string;
      reason: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    // Check current time to determine which meals should be done
    const currentHour = new Date().getHours();
    const childActivitiesMap = new Map<string, ActivityLog[]>();
    activities.forEach(a => {
      if (!childActivitiesMap.has(a.childId)) {
        childActivitiesMap.set(a.childId, []);
      }
      childActivitiesMap.get(a.childId)!.push(a);
    });

    presentChildren.forEach(child => {
      const childActivities = childActivitiesMap.get(child.id) || [];
      const childMeals = childActivities.filter(a => a.activityType === 'meal');
      const childNaps = childActivities.filter(a => a.activityType === 'nap');

      // Check for missed breakfast (after 10am)
      if (currentHour >= 10 && !childMeals.some(m => m.mealType === 'breakfast')) {
        needsAttention.push({
          childId: child.id,
          childName: `${child.firstName} ${child.lastName}`,
          photoUrl: child.photoUrl,
          reason: 'No breakfast recorded',
          priority: 'medium',
        });
      }

      // Check for missed lunch (after 1pm)
      if (currentHour >= 13 && !childMeals.some(m => m.mealType === 'lunch')) {
        needsAttention.push({
          childId: child.id,
          childName: `${child.firstName} ${child.lastName}`,
          photoUrl: child.photoUrl,
          reason: 'No lunch recorded',
          priority: 'high',
        });
      }

      // Check for no nap recorded (after 3pm) - for children who need naps
      if (currentHour >= 15 && childNaps.length === 0) {
        needsAttention.push({
          childId: child.id,
          childName: `${child.firstName} ${child.lastName}`,
          photoUrl: child.photoUrl,
          reason: 'No nap recorded',
          priority: 'low',
        });
      }

      // Check for no activities at all today
      if (childActivities.length === 0) {
        needsAttention.push({
          childId: child.id,
          childName: `${child.firstName} ${child.lastName}`,
          photoUrl: child.photoUrl,
          reason: 'No activities logged today',
          priority: 'medium',
        });
      }
    });

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    needsAttention.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Get recent photos with context
    const recentPhotos: Array<{ url: string; childName: string; time: string; activityType: string }> = [];
    activities
      .filter(a => a.photoUrls && a.photoUrls.length > 0)
      .slice(0, 8)
      .forEach(a => {
        a.photoUrls!.forEach(url => {
          if (recentPhotos.length < 8) {
            recentPhotos.push({
              url,
              childName: a.child ? `${a.child.firstName} ${a.child.lastName}` : 'Unknown',
              time: a.time,
              activityType: a.activityType,
            });
          }
        });
      });

    return {
      date: dateString,
      classInfo: {
        id: classInfo.id,
        name: classInfo.name,
        capacity: classInfo.capacity || 0,
        totalChildren: children.length,
      },
      attendance: {
        present: presentChildren.length,
        absent: absentChildren.length,
        late: lateCount,
        notRecorded: notCheckedIn.length,
        presentChildren,
        absentChildren,
        notCheckedIn,
      },
      quickStats: {
        activitiesLogged: activities.length,
        mealsServed: meals.length,
        napsRecorded: naps.length,
        diaperChanges: diapers.length,
        photosCapture: allPhotos.length,
      },
      activityTimeline,
      needsAttention: needsAttention.slice(0, 10), // Limit to 10 items
      mealStatus,
      recentPhotos,
    };
  }

  /**
   * Get class activity summary for a date range (for teacher reports)
   */
  async getClassActivitySummary(
    tenantId: string,
    classId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    dateRange: { start: string; end: string };
    totalActivities: number;
    byType: Record<string, number>;
    byChild: Array<{
      childId: string;
      childName: string;
      activityCount: number;
      photoCount: number;
    }>;
    dailyBreakdown: Array<{
      date: string;
      activityCount: number;
      attendance: number;
    }>;
  }> {
    const startString = startDate.toISOString().split('T')[0];
    const endString = endDate.toISOString().split('T')[0];

    // Fetch children in the class
    const children = await this.childRepository.find({
      where: { classId, tenantId, enrollmentStatus: EnrollmentStatus.ENROLLED },
      select: ['id', 'firstName', 'lastName'],
    });

    const childIds = children.map(c => c.id);
    const childMap = new Map(children.map(c => [c.id, `${c.firstName} ${c.lastName}`]));

    // Fetch activities
    const activities = await this.activityLogRepository
      .createQueryBuilder('activity')
      .where('activity.tenantId = :tenantId', { tenantId })
      .andWhere('activity.childId IN (:...childIds)', { childIds: childIds.length > 0 ? childIds : ['none'] })
      .andWhere('activity.date >= :startDate', { startDate: startString })
      .andWhere('activity.date <= :endDate', { endDate: endString })
      .getMany();

    // Activity breakdown by type
    const byType: Record<string, number> = {};
    activities.forEach(a => {
      byType[a.activityType] = (byType[a.activityType] || 0) + 1;
    });

    // Activity breakdown by child
    const childActivityCount: Record<string, { count: number; photos: number }> = {};
    activities.forEach(a => {
      if (!childActivityCount[a.childId]) {
        childActivityCount[a.childId] = { count: 0, photos: 0 };
      }
      childActivityCount[a.childId].count++;
      if (a.photoUrls) {
        childActivityCount[a.childId].photos += a.photoUrls.length;
      }
    });

    const byChild = Object.entries(childActivityCount).map(([childId, data]) => ({
      childId,
      childName: childMap.get(childId) || 'Unknown',
      activityCount: data.count,
      photoCount: data.photos,
    }));

    // Daily breakdown
    const dailyMap: Record<string, { activities: number; attendance: Set<string> }> = {};
    activities.forEach(a => {
      // Handle date as either Date object or string (runtime type may differ from TypeScript type)
      const dateValue = a.date as unknown as Date | string;
      const dateKey = typeof dateValue === 'string'
        ? dateValue.split('T')[0]
        : dateValue.toISOString().split('T')[0];
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { activities: 0, attendance: new Set() };
      }
      dailyMap[dateKey].activities++;
      dailyMap[dateKey].attendance.add(a.childId);
    });

    const dailyBreakdown = Object.entries(dailyMap)
      .map(([date, data]) => ({
        date,
        activityCount: data.activities,
        attendance: data.attendance.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      dateRange: { start: startString, end: endString },
      totalActivities: activities.length,
      byType,
      byChild,
      dailyBreakdown,
    };
  }
}

let activityLogService: ActivityLogService;

export function getActivityLogService(): ActivityLogService {
  if (!activityLogService) {
    activityLogService = new ActivityLogService();
  }
  return activityLogService;
}
