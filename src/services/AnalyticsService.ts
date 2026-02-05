import { AppDataSource } from '@config/database';
import { Attendance } from '@models/Attendance';
import { Child } from '@models/Child';
import { StaffProfile } from '@models/StaffProfile';
import { StaffAttendance } from '@models/StaffAttendance';
import { AttendanceStatus, EnrollmentStatus } from '@shared';
import { Repository, Between, IsNull } from 'typeorm';

export class AnalyticsService {
  private attendanceRepository: Repository<Attendance>;
  private childRepository: Repository<Child>;
  private staffRepository: Repository<StaffProfile>;
  private staffAttendanceRepository: Repository<StaffAttendance>;

  constructor() {
    this.attendanceRepository = AppDataSource.getRepository(Attendance);
    this.childRepository = AppDataSource.getRepository(Child);
    this.staffRepository = AppDataSource.getRepository(StaffProfile);
    this.staffAttendanceRepository = AppDataSource.getRepository(StaffAttendance);
  }

  /**
   * Get attendance trends over time
   * @param classId - Optional class ID to filter attendance (for teachers)
   */
  async getAttendanceTrends(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'day',
    classId?: string
  ): Promise<{
    trends: Array<{
      date: string;
      totalChildren: number;
      present: number;
      absent: number;
      late: number;
      attendanceRate: number;
    }>;
    summary: {
      averageAttendanceRate: number;
      totalDays: number;
      peakAttendanceDay: string;
      lowestAttendanceDay: string;
    };
  }> {
    let attendances: Attendance[];

    console.log('[AnalyticsService.getAttendanceTrends] Params:', {
      tenantId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      groupBy,
      classId,
    });

    if (classId) {
      // For class filtering, get attendance for children in the class
      // This handles cases where attendance.classId might not be set

      // Debug: Check all children with this classId (ignore isActive filter for debugging)
      const allChildrenInClass = await this.childRepository.find({
        where: { tenantId, classId },
        select: ['id', 'firstName', 'lastName', 'isActive'],
      });
      console.log('[AnalyticsService.getAttendanceTrends] All children with classId (debug):',
        allChildrenInClass.map(c => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, isActive: c.isActive }))
      );

      // Query with all filters
      const childrenInClass = await this.childRepository.find({
        where: { tenantId, classId, isActive: true, deletedAt: IsNull() },
        select: ['id'],
      });

      const childIds = childrenInClass.map((c) => c.id);
      console.log('[AnalyticsService.getAttendanceTrends] Active children in class:', childIds.length, childIds);

      if (childIds.length === 0) {
        console.log('[AnalyticsService.getAttendanceTrends] No children in class, returning empty');
        // No children in class, return empty trends
        return {
          trends: [],
          summary: {
            averageAttendanceRate: 0,
            totalDays: 0,
            peakAttendanceDay: '',
            lowestAttendanceDay: '',
          },
        };
      }

      // Format dates for the query
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      console.log('[AnalyticsService.getAttendanceTrends] Date range:', startDateStr, 'to', endDateStr);

      try {
        attendances = await this.attendanceRepository
          .createQueryBuilder('attendance')
          .leftJoinAndSelect('attendance.child', 'child')
          .where('attendance.tenantId = :tenantId', { tenantId })
          .andWhere('DATE(attendance.date) >= :startDate', { startDate: startDateStr })
          .andWhere('DATE(attendance.date) <= :endDate', { endDate: endDateStr })
          .andWhere('attendance.deletedAt IS NULL')
          .andWhere('attendance.childId IN (:...childIds)', { childIds })
          .getMany();

        console.log('[AnalyticsService.getAttendanceTrends] Found attendance records:', attendances.length);
      } catch (queryError: any) {
        console.error('[AnalyticsService.getAttendanceTrends] Query error:', queryError.message);
        throw queryError;
      }

      // Debug: If no attendance found, check if there's ANY attendance for these children
      if (attendances.length === 0 && childIds.length > 0) {
        const anyAttendance = await this.attendanceRepository
          .createQueryBuilder('attendance')
          .where('attendance.tenantId = :tenantId', { tenantId })
          .andWhere('attendance.childId IN (:...childIds)', { childIds })
          .getCount();
        console.log('[AnalyticsService.getAttendanceTrends] Total attendance records (any date) for these children:', anyAttendance);
      }
    } else {
      // No class filter, get all attendance
      attendances = await this.attendanceRepository.find({
        where: {
          tenantId,
          date: Between(startDate, endDate),
          deletedAt: IsNull(),
        },
        relations: ['child'],
      });
    }

    // Group by date
    const dateGroups = new Map<string, Attendance[]>();
    attendances.forEach((att) => {
      // Handle both Date objects and string dates from database
      const dateKey = typeof att.date === 'string'
        ? att.date.split('T')[0]
        : att.date.toISOString().split('T')[0];
      if (!dateGroups.has(dateKey)) {
        dateGroups.set(dateKey, []);
      }
      dateGroups.get(dateKey)!.push(att);
    });

    const trends: Array<{
      date: string;
      totalChildren: number;
      present: number;
      absent: number;
      late: number;
      attendanceRate: number;
    }> = [];

    let totalAttendanceRate = 0;
    let peakRate = 0;
    let lowestRate = 100;
    let peakDay = '';
    let lowestDay = '';

    Array.from(dateGroups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, atts]) => {
        const present = atts.filter((a) => a.status === AttendanceStatus.PRESENT).length;
        const absent = atts.filter((a) => a.status === AttendanceStatus.ABSENT).length;
        const late = atts.filter((a) => a.status === AttendanceStatus.LATE).length;
        const totalChildren = atts.length;
        const attendanceRate = totalChildren > 0 ? (present / totalChildren) * 100 : 0;

        trends.push({
          date,
          totalChildren,
          present,
          absent,
          late,
          attendanceRate,
        });

        totalAttendanceRate += attendanceRate;

        if (attendanceRate > peakRate) {
          peakRate = attendanceRate;
          peakDay = date;
        }

        if (attendanceRate < lowestRate && totalChildren > 0) {
          lowestRate = attendanceRate;
          lowestDay = date;
        }
      });

    const result = {
      trends,
      summary: {
        averageAttendanceRate: trends.length > 0 ? totalAttendanceRate / trends.length : 0,
        totalDays: trends.length,
        peakAttendanceDay: peakDay,
        lowestAttendanceDay: lowestDay,
      },
    };

    console.log('[AnalyticsService.getAttendanceTrends] Returning:', {
      trendsCount: trends.length,
      summary: result.summary,
    });

    return result;
  }

  /**
   * Get attendance rate by class
   */
  async getAttendanceByClass(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{
      classId: string;
      className: string;
      totalChildren: number;
      averageAttendanceRate: number;
      presentDays: number;
      absentDays: number;
    }>
  > {
    const attendances = await this.attendanceRepository.find({
      where: {
        tenantId,
        date: Between(startDate, endDate),
        deletedAt: IsNull(),
      },
      relations: ['child', 'class'],
    });

    const classSummary = new Map<
      string,
      {
        className: string;
        children: Set<string>;
        presentDays: number;
        absentDays: number;
        totalRecords: number;
      }
    >();

    attendances.forEach((att) => {
      if (!att.classId) return;

      const classId = att.classId;
      if (!classSummary.has(classId)) {
        classSummary.set(classId, {
          className: att.class?.name || 'Unknown',
          children: new Set(),
          presentDays: 0,
          absentDays: 0,
          totalRecords: 0,
        });
      }

      const summary = classSummary.get(classId)!;
      summary.children.add(att.childId);
      summary.totalRecords++;

      if (att.status === AttendanceStatus.PRESENT) {
        summary.presentDays++;
      } else if (att.status === AttendanceStatus.ABSENT) {
        summary.absentDays++;
      }
    });

    return Array.from(classSummary.entries()).map(([classId, summary]) => ({
      classId,
      className: summary.className,
      totalChildren: summary.children.size,
      averageAttendanceRate:
        summary.totalRecords > 0 ? (summary.presentDays / summary.totalRecords) * 100 : 0,
      presentDays: summary.presentDays,
      absentDays: summary.absentDays,
    }));
  }

  /**
   * Get enrollment trends
   */
  async getEnrollmentTrends(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    trends: Array<{
      month: string;
      newEnrollments: number;
      withdrawals: number;
      netChange: number;
      totalActive: number;
    }>;
    summary: {
      totalEnrollments: number;
      totalWithdrawals: number;
      netGrowth: number;
      growthRate: number;
    };
  }> {
    const children = await this.childRepository.find({
      where: { tenantId, isActive: true },
    });

    // Group by month
    const monthlyData = new Map<
      string,
      {
        newEnrollments: number;
        withdrawals: number;
      }
    >();

    children.forEach((child) => {
      if (child.enrollmentDate && child.enrollmentDate >= startDate && child.enrollmentDate <= endDate) {
        const monthKey = `${child.enrollmentDate.getFullYear()}-${String(
          child.enrollmentDate.getMonth() + 1
        ).padStart(2, '0')}`;

        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { newEnrollments: 0, withdrawals: 0 });
        }

        monthlyData.get(monthKey)!.newEnrollments++;
      }

      if (
        child.withdrawalDate &&
        child.withdrawalDate >= startDate &&
        child.withdrawalDate <= endDate
      ) {
        const monthKey = `${child.withdrawalDate.getFullYear()}-${String(
          child.withdrawalDate.getMonth() + 1
        ).padStart(2, '0')}`;

        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { newEnrollments: 0, withdrawals: 0 });
        }

        monthlyData.get(monthKey)!.withdrawals++;
      }
    });

    const trends: Array<{
      month: string;
      newEnrollments: number;
      withdrawals: number;
      netChange: number;
      totalActive: number;
    }> = [];

    let runningTotal = 0;
    let totalEnrollments = 0;
    let totalWithdrawals = 0;

    Array.from(monthlyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([month, data]) => {
        const netChange = data.newEnrollments - data.withdrawals;
        runningTotal += netChange;
        totalEnrollments += data.newEnrollments;
        totalWithdrawals += data.withdrawals;

        trends.push({
          month,
          newEnrollments: data.newEnrollments,
          withdrawals: data.withdrawals,
          netChange,
          totalActive: runningTotal,
        });
      });

    const netGrowth = totalEnrollments - totalWithdrawals;
    const growthRate = totalEnrollments > 0 ? (netGrowth / totalEnrollments) * 100 : 0;

    return {
      trends,
      summary: {
        totalEnrollments,
        totalWithdrawals,
        netGrowth,
        growthRate,
      },
    };
  }

  /**
   * Get enrollment demographics
   */
  async getEnrollmentDemographics(tenantId: string): Promise<{
    byGender: Record<string, number>;
    byAgeGroup: Array<{ ageGroup: string; count: number }>;
    byStatus: Record<string, number>;
    totalChildren: number;
  }> {
    const children = await this.childRepository.find({
      where: { tenantId, isActive: true },
    });

    const demographics = {
      byGender: {
        male: 0,
        female: 0,
        other: 0,
      } as Record<string, number>,
      byAgeGroup: [] as Array<{ ageGroup: string; count: number }>,
      byStatus: {} as Record<string, number>,
      totalChildren: children.length,
    };

    // Initialize status counts
    Object.values(EnrollmentStatus).forEach((status) => {
      demographics.byStatus[status] = 0;
    });

    const ageGroups: Record<string, number> = {
      '0-1': 0,
      '1-2': 0,
      '2-3': 0,
      '3-4': 0,
      '4-5': 0,
      '5+': 0,
    };

    const now = new Date();
    children.forEach((child) => {
      // Gender
      const gender = child.gender.toLowerCase();
      if (!demographics.byGender[gender]) {
        demographics.byGender[gender] = 0;
      }
      demographics.byGender[gender]++;

      // Age group
      const ageInMonths =
        (now.getTime() - child.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 30);
      const ageInYears = ageInMonths / 12;

      if (ageInYears < 1) ageGroups['0-1']++;
      else if (ageInYears < 2) ageGroups['1-2']++;
      else if (ageInYears < 3) ageGroups['2-3']++;
      else if (ageInYears < 4) ageGroups['3-4']++;
      else if (ageInYears < 5) ageGroups['4-5']++;
      else ageGroups['5+']++;

      // Status
      demographics.byStatus[child.enrollmentStatus]++;
    });

    demographics.byAgeGroup = Object.entries(ageGroups).map(([ageGroup, count]) => ({
      ageGroup,
      count,
    }));

    return demographics;
  }

  /**
   * Get retention rate
   */
  async getRetentionRate(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalEnrolled: number;
    totalWithdrawn: number;
    retentionRate: number;
    averageEnrollmentDuration: number; // in days
  }> {
    const children = await this.childRepository.find({
      where: { tenantId, isActive: true },
    });

    const enrolledInPeriod = children.filter(
      (c) => c.enrollmentDate && c.enrollmentDate >= startDate && c.enrollmentDate <= endDate
    );

    const withdrawnInPeriod = children.filter(
      (c) =>
        c.withdrawalDate &&
        c.withdrawalDate >= startDate &&
        c.withdrawalDate <= endDate
    );

    let totalDuration = 0;
    let countWithDuration = 0;

    children.forEach((c) => {
      if (c.enrollmentDate && c.withdrawalDate) {
        const duration =
          (c.withdrawalDate.getTime() - c.enrollmentDate.getTime()) / (1000 * 60 * 60 * 24);
        totalDuration += duration;
        countWithDuration++;
      }
    });

    const averageEnrollmentDuration =
      countWithDuration > 0 ? totalDuration / countWithDuration : 0;

    const totalEnrolled = enrolledInPeriod.length;
    const totalWithdrawn = withdrawnInPeriod.length;
    const retentionRate =
      totalEnrolled > 0 ? ((totalEnrolled - totalWithdrawn) / totalEnrolled) * 100 : 100;

    return {
      totalEnrolled,
      totalWithdrawn,
      retentionRate,
      averageEnrollmentDuration,
    };
  }

  /**
   * Get staff analytics
   */
  async getStaffAnalytics(tenantId: string, startDate: Date, endDate: Date): Promise<{
    totalStaff: number;
    activeStaff: number;
    staffAttendanceRate: number;
    averageHoursWorked: number;
    overtimeHours: number;
    byPosition: Record<string, number>;
  }> {
    const staff = await this.staffRepository.find({
      where: { tenantId },
    });

    const staffAttendances = await this.staffAttendanceRepository.find({
      where: {
        tenantId,
        attendanceDate: Between(startDate, endDate),
        isActive: true,
      },
    });

    const byPosition: Record<string, number> = {};
    let activeCount = 0;

    staff.forEach((s) => {
      if (s.isActive) activeCount++;

      if (!byPosition[s.position]) {
        byPosition[s.position] = 0;
      }
      byPosition[s.position]++;
    });

    let totalHours = 0;
    let overtimeHours = 0;
    let presentDays = 0;

    staffAttendances.forEach((att) => {
      if (att.totalHours) {
        totalHours += att.totalHours;

        if (att.totalHours > 8) {
          overtimeHours += att.totalHours - 8;
        }
      }

      if (att.status === 'present' || att.status === 'late') {
        presentDays++;
      }
    });

    const staffAttendanceRate =
      staffAttendances.length > 0 ? (presentDays / staffAttendances.length) * 100 : 0;

    const averageHoursWorked =
      staffAttendances.length > 0 ? totalHours / staffAttendances.length : 0;

    return {
      totalStaff: staff.length,
      activeStaff: activeCount,
      staffAttendanceRate,
      averageHoursWorked,
      overtimeHours,
      byPosition,
    };
  }

  /**
   * Get overall dashboard summary
   * @param tenantId - The tenant ID
   * @param classId - Optional class ID to filter stats (for staff with VIEW_CLASS_CHILDREN permission)
   */
  async getDashboardSummary(tenantId: string, classId?: string): Promise<{
    children: {
      total: number;
      enrolled: number;
      waitlist: number;
      todayPresent: number;
      todayAbsent: number;
    };
    staff: {
      total: number;
      active: number;
      todayPresent: number;
      todayAbsent: number;
    };
    attendance: {
      todayRate: number;
      weekRate: number;
      monthRate: number;
    };
    filteredByClass?: string;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    // Build where clause for children - filter by class if provided
    const childrenWhere: any = { tenantId, isActive: true, deletedAt: IsNull() };
    if (classId) {
      childrenWhere.class = { id: classId };
    }

    // Children stats
    const children = await this.childRepository.find({
      where: childrenWhere,
      relations: ['class'],
    });

    const enrolled = children.filter(
      (c) => c.enrollmentStatus === EnrollmentStatus.ENROLLED
    ).length;

    const waitlist = children.filter(
      (c) => c.enrollmentStatus === EnrollmentStatus.WAITLIST
    ).length;

    // Build where clause for attendance - filter by class if provided
    const attendanceWhere: any = { tenantId, date: today, deletedAt: IsNull() };
    if (classId) {
      attendanceWhere.classId = classId;
    }

    // Today's attendance
    const todayAttendance = await this.attendanceRepository.find({
      where: attendanceWhere,
    });

    const todayPresent = todayAttendance.filter(
      (a) => a.status === AttendanceStatus.PRESENT
    ).length;
    const todayAbsent = todayAttendance.filter(
      (a) => a.status === AttendanceStatus.ABSENT
    ).length;

    // Staff stats (staff stats are NOT filtered by class - managers see all staff)
    const staff = await this.staffRepository.find({
      where: { tenantId },
    });

    const activeStaff = staff.filter((s) => s.isActive).length;

    const todayStaffAttendance = await this.staffAttendanceRepository.find({
      where: { tenantId, attendanceDate: today, isActive: true },
    });

    const staffTodayPresent = todayStaffAttendance.filter(
      (a) => a.status === 'present' || a.status === 'late'
    ).length;
    const staffTodayAbsent = todayStaffAttendance.filter((a) => a.status === 'absent').length;

    // Attendance rates - filter by class if provided
    const weekAttendanceWhere: any = {
      tenantId,
      date: Between(weekAgo, today),
      deletedAt: IsNull(),
    };
    if (classId) {
      weekAttendanceWhere.classId = classId;
    }

    const weekAttendance = await this.attendanceRepository.find({
      where: weekAttendanceWhere,
    });

    const monthAttendanceWhere: any = {
      tenantId,
      date: Between(monthAgo, today),
      deletedAt: IsNull(),
    };
    if (classId) {
      monthAttendanceWhere.classId = classId;
    }

    const monthAttendance = await this.attendanceRepository.find({
      where: monthAttendanceWhere,
    });

    const calculateRate = (attendances: Attendance[]) => {
      if (attendances.length === 0) return 0;
      const present = attendances.filter((a) => a.status === AttendanceStatus.PRESENT).length;
      return (present / attendances.length) * 100;
    };

    const result: any = {
      children: {
        total: children.length,
        enrolled,
        waitlist,
        todayPresent,
        todayAbsent,
      },
      staff: {
        total: staff.length,
        active: activeStaff,
        todayPresent: staffTodayPresent,
        todayAbsent: staffTodayAbsent,
      },
      attendance: {
        todayRate: calculateRate(todayAttendance),
        weekRate: calculateRate(weekAttendance),
        monthRate: calculateRate(monthAttendance),
      },
    };

    // Include filtered class info if filtering was applied
    if (classId) {
      result.filteredByClass = classId;
    }

    return result;
  }
}

// Singleton instance
let analyticsServiceInstance: AnalyticsService | null = null;

export function getAnalyticsService(): AnalyticsService {
  if (!analyticsServiceInstance) {
    analyticsServiceInstance = new AnalyticsService();
  }
  return analyticsServiceInstance;
}
