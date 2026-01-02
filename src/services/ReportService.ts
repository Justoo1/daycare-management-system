import { AppDataSource } from '@config/database';
import { Report, ReportType, ReportFormat } from '@models/Report';
import { getAnalyticsService } from './AnalyticsService';
import { Repository } from 'typeorm';

export class ReportService {
  private reportRepository: Repository<Report>;
  private analyticsService: ReturnType<typeof getAnalyticsService>;

  constructor() {
    this.reportRepository = AppDataSource.getRepository(Report);
    this.analyticsService = getAnalyticsService();
  }

  /**
   * Generate a custom report
   */
  async generateReport(
    tenantId: string,
    userId: string,
    data: {
      reportType: ReportType;
      reportName: string;
      startDate: Date;
      endDate: Date;
      filters?: Record<string, any>;
      format?: ReportFormat;
    }
  ): Promise<Report> {
    let reportData: any = {};
    let summary: Record<string, any> = {};

    // Generate report data based on type
    switch (data.reportType) {
      case ReportType.ATTENDANCE:
        reportData = await this.generateAttendanceReport(
          tenantId,
          data.startDate,
          data.endDate,
          data.filters
        );
        summary = reportData.summary;
        break;

      case ReportType.ENROLLMENT:
        reportData = await this.generateEnrollmentReport(
          tenantId,
          data.startDate,
          data.endDate
        );
        summary = reportData.summary;
        break;

      case ReportType.STAFF:
        reportData = await this.generateStaffReport(
          tenantId,
          data.startDate,
          data.endDate
        );
        summary = reportData.summary;
        break;

      case ReportType.CUSTOM:
        reportData = data.filters || {};
        break;

      default:
        throw new Error(`Unsupported report type: ${data.reportType}`);
    }

    const report = this.reportRepository.create({
      tenantId,
      reportType: data.reportType,
      reportName: data.reportName,
      generatedBy: userId,
      startDate: data.startDate,
      endDate: data.endDate,
      filters: data.filters || {},
      data: reportData,
      summary,
      format: data.format || ReportFormat.JSON,
      isActive: true,
    });

    return this.reportRepository.save(report);
  }

  /**
   * Generate attendance report
   */
  private async generateAttendanceReport(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    filters?: Record<string, any>
  ): Promise<any> {
    const trends = await this.analyticsService.getAttendanceTrends(
      tenantId,
      startDate,
      endDate
    );

    const byClass = await this.analyticsService.getAttendanceByClass(
      tenantId,
      startDate,
      endDate
    );

    return {
      trends: trends.trends,
      byClass,
      summary: trends.summary,
    };
  }

  /**
   * Generate enrollment report
   */
  private async generateEnrollmentReport(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const trends = await this.analyticsService.getEnrollmentTrends(
      tenantId,
      startDate,
      endDate
    );

    const demographics = await this.analyticsService.getEnrollmentDemographics(tenantId);

    const retention = await this.analyticsService.getRetentionRate(
      tenantId,
      startDate,
      endDate
    );

    return {
      trends: trends.trends,
      demographics,
      retention,
      summary: {
        ...trends.summary,
        retentionRate: retention.retentionRate,
      },
    };
  }

  /**
   * Generate staff report
   */
  private async generateStaffReport(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const staffAnalytics = await this.analyticsService.getStaffAnalytics(
      tenantId,
      startDate,
      endDate
    );

    return {
      ...staffAnalytics,
      summary: {
        totalStaff: staffAnalytics.totalStaff,
        activeStaff: staffAnalytics.activeStaff,
        attendanceRate: staffAnalytics.staffAttendanceRate,
        averageHours: staffAnalytics.averageHoursWorked,
        totalOvertime: staffAnalytics.overtimeHours,
      },
    };
  }

  /**
   * Get all reports
   */
  async getReports(
    tenantId: string,
    filters?: {
      reportType?: ReportType;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<Report[]> {
    const where: any = { tenantId, isActive: true };

    if (filters?.reportType) where.reportType = filters.reportType;

    return this.reportRepository.find({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get report by ID
   */
  async getReportById(tenantId: string, reportId: string): Promise<Report | null> {
    return this.reportRepository.findOne({
      where: { id: reportId, tenantId },
      relations: ['user'],
    });
  }

  /**
   * Delete report
   */
  async deleteReport(tenantId: string, reportId: string): Promise<void> {
    const report = await this.getReportById(tenantId, reportId);

    if (!report) {
      throw new Error('Report not found');
    }

    report.isActive = false;
    await this.reportRepository.save(report);
  }

  /**
   * Get recent reports
   */
  async getRecentReports(tenantId: string, limit: number = 10): Promise<Report[]> {
    return this.reportRepository.find({
      where: { tenantId, isActive: true },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get report statistics
   */
  async getReportStatistics(tenantId: string): Promise<{
    totalReports: number;
    byType: Record<ReportType, number>;
    recentCount: number;
  }> {
    const reports = await this.reportRepository.find({
      where: { tenantId, isActive: true },
    });

    const statistics = {
      totalReports: reports.length,
      byType: {} as Record<ReportType, number>,
      recentCount: 0,
    };

    // Initialize type counts
    Object.values(ReportType).forEach((type) => {
      statistics.byType[type] = 0;
    });

    reports.forEach((report) => {
      statistics.byType[report.reportType]++;

      if (report.isRecent()) {
        statistics.recentCount++;
      }
    });

    return statistics;
  }
}

// Singleton instance
let reportServiceInstance: ReportService | null = null;

export function getReportService(): ReportService {
  if (!reportServiceInstance) {
    reportServiceInstance = new ReportService();
  }
  return reportServiceInstance;
}
