import { AppDataSource } from '@config/database';
import { ProgressReport } from '@models/ProgressReport';
import { Child } from '@models/Child';
import { Repository } from 'typeorm';
import { getMilestoneService } from './MilestoneService';
import { getAssessmentService } from './AssessmentService';

export class ProgressReportService {
  private progressReportRepository: Repository<ProgressReport>;
  private childRepository: Repository<Child>;

  constructor() {
    this.progressReportRepository = AppDataSource.getRepository(ProgressReport);
    this.childRepository = AppDataSource.getRepository(Child);
  }

  /**
   * Generate a progress report for a child
   */
  async generateProgressReport(
    tenantId: string,
    childId: string,
    generatedBy: string,
    data: {
      reportPeriod: string;
      startDate: Date;
      endDate: Date;
      teacherComments?: string;
      directorComments?: string;
      behaviorRating?: number;
      socialSkillsRating?: number;
      academicProgressRating?: number;
      academicProgress?: string;
      socialEmotionalDevelopment?: string;
      physicalDevelopment?: string;
      languageDevelopment?: string;
      cognitiveDevelopment?: string;
      recommendations?: string;
      goalsForNextPeriod?: string;
    }
  ): Promise<ProgressReport> {
    // Get child
    const child = await this.childRepository.findOne({
      where: { id: childId, tenantId },
      relations: ['attendances'],
    });

    if (!child) {
      throw new Error('Child not found');
    }

    // Calculate attendance rate for the period
    const attendances = child.attendances?.filter(
      (a) => a.date >= data.startDate && a.date <= data.endDate
    ) || [];

    const totalDaysPresent = attendances.filter(a => a.status === 'present' || a.status === 'late').length;
    const totalDaysAbsent = attendances.filter(a => a.status === 'absent').length;
    const totalDays = attendances.length;
    const attendanceRate = totalDays > 0 ? (totalDaysPresent / totalDays) * 100 : 0;

    // Get milestones achieved during the period
    const milestoneService = getMilestoneService();
    const allMilestones = await milestoneService.getMilestonesByChild(tenantId, childId);
    const milestonesAchieved = allMilestones
      .filter(
        (m) => m.dateAchieved && m.dateAchieved >= data.startDate && m.dateAchieved <= data.endDate
      )
      .map((m) => ({
        id: m.id,
        title: m.title,
        date: m.dateAchieved!,
      }));

    // Get assessments from the period
    const assessmentService = getAssessmentService();
    const allAssessments = await assessmentService.getAssessmentsByChild(tenantId, childId);
    const periodAssessments = allAssessments.filter(
      (a) => a.assessmentDate >= data.startDate && a.assessmentDate <= data.endDate
    );
    const assessmentsSummary = periodAssessments.map((a) => ({
      id: a.id,
      type: a.assessmentType,
      score: a.overallScore || 0,
    }));

    // Calculate ratings from assessments if not provided
    // Convert assessment scores (0-100) to ratings (1-5)
    const scoreToRating = (score: number): number => Math.min(5, Math.max(1, Math.round(score / 20)));

    // Get behavioral assessment score for behavior rating
    const behavioralAssessment = periodAssessments.find(a => a.assessmentType === 'behavioral');
    const calculatedBehaviorRating = behavioralAssessment?.overallScore
      ? scoreToRating(behavioralAssessment.overallScore)
      : null;

    // Get developmental assessment score for social skills rating
    const developmentalAssessment = periodAssessments.find(a => a.assessmentType === 'developmental');
    const calculatedSocialSkillsRating = developmentalAssessment?.overallScore
      ? scoreToRating(developmentalAssessment.overallScore)
      : null;

    // Get academic assessment score for academic rating
    const academicAssessment = periodAssessments.find(a => a.assessmentType === 'academic');
    const calculatedAcademicRating = academicAssessment?.overallScore
      ? scoreToRating(academicAssessment.overallScore)
      : null;

    const report = this.progressReportRepository.create({
      tenantId,
      childId,
      reportPeriod: data.reportPeriod,
      startDate: data.startDate,
      endDate: data.endDate,
      teacherComments: data.teacherComments,
      directorComments: data.directorComments,
      attendanceRate,
      totalDaysPresent,
      totalDaysAbsent,
      behaviorRating: data.behaviorRating ?? calculatedBehaviorRating ?? null,
      socialSkillsRating: data.socialSkillsRating ?? calculatedSocialSkillsRating ?? null,
      academicProgressRating: data.academicProgressRating ?? calculatedAcademicRating ?? null,
      academicProgress: data.academicProgress,
      socialEmotionalDevelopment: data.socialEmotionalDevelopment,
      physicalDevelopment: data.physicalDevelopment,
      languageDevelopment: data.languageDevelopment,
      cognitiveDevelopment: data.cognitiveDevelopment,
      milestonesAchieved,
      assessmentsSummary,
      recommendations: data.recommendations,
      goalsForNextPeriod: data.goalsForNextPeriod,
      generatedBy,
      generatedAt: new Date(),
      isActive: true,
      isSharedWithParent: false,
    });

    return this.progressReportRepository.save(report);
  }

  /**
   * Get all progress reports for a child
   */
  async getProgressReportsByChild(tenantId: string, childId: string): Promise<ProgressReport[]> {
    return this.progressReportRepository.find({
      where: { tenantId, childId, isActive: true },
      relations: ['child', 'generator'],
      order: { generatedAt: 'DESC' },
    });
  }

  /**
   * Get progress report by ID
   */
  async getProgressReportById(
    tenantId: string,
    reportId: string
  ): Promise<ProgressReport | null> {
    return this.progressReportRepository.findOne({
      where: { id: reportId, tenantId },
      relations: ['child', 'generator'],
    });
  }

  /**
   * Update progress report
   */
  async updateProgressReport(
    tenantId: string,
    reportId: string,
    data: Partial<ProgressReport>
  ): Promise<ProgressReport> {
    const report = await this.getProgressReportById(tenantId, reportId);

    if (!report) {
      throw new Error('Progress report not found');
    }

    // Don't allow updating these fields
    const {
      tenantId: _,
      id: __,
      childId,
      generatedBy,
      generatedAt,
      milestonesAchieved,
      assessmentsSummary,
      attendanceRate,
      totalDaysPresent,
      totalDaysAbsent,
      ...updateData
    } = data as any;

    Object.assign(report, updateData);

    return this.progressReportRepository.save(report);
  }

  /**
   * Delete progress report
   */
  async deleteProgressReport(tenantId: string, reportId: string): Promise<void> {
    const report = await this.getProgressReportById(tenantId, reportId);

    if (!report) {
      throw new Error('Progress report not found');
    }

    report.isActive = false;
    await this.progressReportRepository.save(report);
  }

  /**
   * Share report with parent
   */
  async shareWithParent(tenantId: string, reportId: string): Promise<ProgressReport> {
    const report = await this.getProgressReportById(tenantId, reportId);

    if (!report) {
      throw new Error('Progress report not found');
    }

    report.isSharedWithParent = true;
    report.sharedAt = new Date();

    return this.progressReportRepository.save(report);
  }

  /**
   * Generate bulk progress reports for a class
   */
  async generateBulkReportsForClass(
    tenantId: string,
    classId: string,
    generatedBy: string,
    data: {
      reportPeriod: string;
      startDate: Date;
      endDate: Date;
    }
  ): Promise<ProgressReport[]> {
    // Get all children in the class
    const children = await this.childRepository.find({
      where: { tenantId, class: { id: classId }, isActive: true },
    });

    const reports: ProgressReport[] = [];

    for (const child of children) {
      try {
        const report = await this.generateProgressReport(
          tenantId,
          child.id,
          generatedBy,
          {
            reportPeriod: data.reportPeriod,
            startDate: data.startDate,
            endDate: data.endDate,
            teacherComments: `Progress report for ${child.getFullName()}`,
          }
        );
        reports.push(report);
      } catch (error) {
        console.error(`Failed to generate report for child ${child.id}:`, error);
      }
    }

    return reports;
  }

  /**
   * Get report statistics
   */
  async getReportStatistics(tenantId: string, childId: string): Promise<{
    totalReports: number;
    averageOverallRating: number;
    averageAttendanceRate: number;
    latestReport: ProgressReport | null;
    improvementTrend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  }> {
    const reports = await this.getProgressReportsByChild(tenantId, childId);

    if (reports.length === 0) {
      return {
        totalReports: 0,
        averageOverallRating: 0,
        averageAttendanceRate: 0,
        latestReport: null,
        improvementTrend: 'insufficient_data',
      };
    }

    let totalRating = 0;
    let totalAttendance = 0;

    reports.forEach((report) => {
      totalRating += report.getOverallRating();
      totalAttendance += report.attendanceRate || 0;
    });

    const averageOverallRating = totalRating / reports.length;
    const averageAttendanceRate = totalAttendance / reports.length;

    // Determine trend (compare first and last report)
    let improvementTrend: 'improving' | 'stable' | 'declining' | 'insufficient_data' =
      'insufficient_data';

    if (reports.length >= 2) {
      const firstRating = reports[reports.length - 1].getOverallRating();
      const lastRating = reports[0].getOverallRating();
      const change = lastRating - firstRating;

      if (change > 0.3) improvementTrend = 'improving';
      else if (change < -0.3) improvementTrend = 'declining';
      else improvementTrend = 'stable';
    }

    return {
      totalReports: reports.length,
      averageOverallRating,
      averageAttendanceRate,
      latestReport: reports[0],
      improvementTrend,
    };
  }
}

// Singleton instance
let progressReportServiceInstance: ProgressReportService | null = null;

export function getProgressReportService(): ProgressReportService {
  if (!progressReportServiceInstance) {
    progressReportServiceInstance = new ProgressReportService();
  }
  return progressReportServiceInstance;
}
