import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import { config } from './config/environment';
import { initializeDatabase } from './config/database';
import { tenantMiddleware } from './middleware/tenant';
import { requireManagerRole, requireStaffRole, validateParentChildAccess } from './middleware/rbac';
import { AuthController } from './controllers/AuthController';
import { TenantController } from './controllers/TenantController';
import { ChildController } from './controllers/ChildController';
import { AttendanceController } from './controllers/AttendanceController';
import { ActivityLogController } from './controllers/ActivityLogController';
import { NotificationController } from './controllers/NotificationController';
import { FileUploadController } from './controllers/FileUploadController';
import { CenterController } from './controllers/CenterController';
import { ClassController } from './controllers/ClassController';
import { MilestoneController } from './controllers/MilestoneController';
import { AssessmentController } from './controllers/AssessmentController';
import { ProgressReportController } from './controllers/ProgressReportController';
import { StaffController } from './controllers/StaffController';
import { CertificationController } from './controllers/CertificationController';
import { ShiftController } from './controllers/ShiftController';
import { StaffAttendanceController } from './controllers/StaffAttendanceController';
import { AnalyticsController } from './controllers/AnalyticsController';
import { ReportController } from './controllers/ReportController';
import { GuardianController } from './controllers/GuardianController';
import { invoiceController } from './controllers/invoice.controller';
import { paymentController } from './controllers/payment.controller';
import { subscriptionController } from './controllers/subscription.controller';
import { mediaController } from './controllers/media.controller';
import { tenantPaymentController } from './controllers/tenant-payment.controller';
import * as authSchemas from './schemas/auth.schema';
import * as analyticsSchemas from './schemas/analytics.schema';
import * as reportSchemas from './schemas/report.schema';
import * as tenantSchemas from './schemas/tenant.schema';
import * as childSchemas from './schemas/child.schema';
import * as attendanceSchemas from './schemas/attendance.schema';
import * as activitySchemas from './schemas/activity.schema';
import * as staffSchemas from './schemas/staff.schema';
import * as milestoneSchemas from './schemas/milestone.schema';
import * as centerSchemas from './schemas/center.schema';
import * as notificationSchemas from './schemas/notification.schema';

// Initialize Fastify instance
const fastify = Fastify({
  logger: config.nodeEnv === 'development',
});

/**
 * Authentication middleware for protected routes
 * Extracts authenticated user context from JWT token and fetches permissions
 */
async function authenticateRoute(request: any, reply: any) {
  try {
    await request.jwtVerify();

    // Extract request context from JWT payload
    // This includes tenant info, user info, and staff's assigned classId
    const jwtPayload = request.user;

    // Import getEffectivePermissions to calculate user's permissions
    const { getEffectivePermissions } = await import('./middleware/rbac');

    // Start with basic context
    let classId = jwtPayload.classId;
    let permissions: string[] = [];

    // For staff roles, fetch their profile to get custom permissions
    const staffRoles = ['teacher', 'staff', 'director'];
    if (staffRoles.includes(jwtPayload.role)) {
      try {
        const { StaffProfile } = await import('./models/StaffProfile');
        const { AppDataSource } = await import('./config/database');
        const staffRepo = AppDataSource.getRepository(StaffProfile);

        const staffProfile = await staffRepo.findOne({
          where: { userId: jwtPayload.userId, isActive: true },
          select: ['classId', 'permissions', 'useCustomPermissions'],
        });

        console.log('[Auth Debug] Staff profile lookup:', {
          userId: jwtPayload.userId,
          role: jwtPayload.role,
          found: !!staffProfile,
          staffClassId: staffProfile?.classId,
          jwtClassId: jwtPayload.classId,
        });

        if (staffProfile) {
          classId = staffProfile.classId || classId;
          permissions = getEffectivePermissions(
            jwtPayload.role,
            staffProfile.permissions,
            staffProfile.useCustomPermissions
          );
        } else {
          permissions = getEffectivePermissions(jwtPayload.role, null, false);
        }
      } catch (err) {
        // If staff profile fetch fails, use default role permissions
        permissions = getEffectivePermissions(jwtPayload.role, null, false);
      }
    } else {
      // For non-staff roles (super_admin, center_owner, parent), use default permissions
      permissions = getEffectivePermissions(jwtPayload.role, null, false);
    }

    request.tenant = {
      tenantId: jwtPayload.tenantId,
      userId: jwtPayload.userId,
      centerId: jwtPayload.centerId,
      classId, // Staff member's assigned class (undefined for non-staff)
      role: jwtPayload.role,
      email: jwtPayload.email,
      permissions, // User's effective permissions
    };
  } catch (error) {
    reply.status(401).send({ success: false, error: 'Unauthorized' });
  }
}

/**
 * Register plugins
 */
async function registerPlugins() {
  // CORS
  await fastify.register(fastifyCors, {
    origin: '*',
    credentials: true,
  });

  // Security headers
  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: false,
  });

  // Swagger Documentation
  await fastify.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Nkabom Daycare API',
        description: 'Comprehensive daycare management system API with child care tracking, staff management, educational portfolio, analytics, and reporting capabilities.',
        version: '0.3.0',
        contact: {
          name: 'Nkabom Daycare',
          url: 'https://nkabom.com',
        },
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
        {
          url: 'https://api.nkabom.com',
          description: 'Production server',
        },
      ],
      tags: [
        { name: 'Authentication', description: 'User authentication and authorization endpoints' },
        { name: 'Tenants', description: 'Multi-tenant organization management' },
        { name: 'Children', description: 'Child profile and enrollment management' },
        { name: 'Guardians', description: 'Guardian and family management' },
        { name: 'Attendance', description: 'Child attendance tracking and check-in/out' },
        { name: 'Activities', description: 'Daily activity logging (meals, naps, learning)' },
        { name: 'Notifications', description: 'SMS notifications via Arkesel' },
        { name: 'File Uploads', description: 'Photo, document, and media uploads' },
        { name: 'Centers', description: 'Daycare center management' },
        { name: 'Classes', description: 'Classroom management and capacity tracking' },
        { name: 'Milestones', description: 'Child developmental milestone tracking' },
        { name: 'Assessments', description: 'Child assessments and evaluations' },
        { name: 'Progress Reports', description: 'Educational progress reporting' },
        { name: 'Staff', description: 'Staff profile and employment management' },
        { name: 'Certifications', description: 'Staff certification and qualification tracking' },
        { name: 'Shifts', description: 'Staff shift scheduling and management' },
        { name: 'Staff Attendance', description: 'Staff attendance and time tracking' },
        { name: 'Analytics', description: 'Advanced analytics and insights' },
        { name: 'Reports', description: 'Report generation and management' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Enter your JWT token in the format: Bearer {token}',
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
  });

  // Swagger UI
  await fastify.register(fastifySwaggerUI, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      syntaxHighlight: {
        activate: true,
        theme: 'monokai',
      },
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  // JWT
  await fastify.register(fastifyJwt, {
    secret: config.jwt.secret,
  });

  // Multipart (file upload support)
  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB max file size
    },
  });

  // Tenant middleware
  await fastify.register(tenantMiddleware);
}

/**
 * Register routes
 */
async function registerRoutes() {
  // Health check
  fastify.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // API version
  fastify.get('/api/version', async (request, reply) => {
    return {
      version: '0.1.0',
      name: 'Nkabom Daycare API',
      timestamp: new Date().toISOString(),
    };
  });

  // Tenant routes (public)
  // Note: Register specific routes before parameterized routes
  fastify.post('/api/tenants/register', { schema: tenantSchemas.registerTenantSchema }, TenantController.register);
  fastify.get('/api/tenants/slug/:slug', { schema: tenantSchemas.getTenantBySlugSchema }, TenantController.getTenantBySlug);
  fastify.get('/api/tenants/:id', { schema: tenantSchemas.getTenantByIdSchema }, TenantController.getTenantById);

  // Auth routes (public - no authentication required)
  fastify.post('/api/auth/register', { schema: authSchemas.registerSchema }, AuthController.register);
  fastify.post('/api/auth/login', { schema: authSchemas.loginSchema }, AuthController.login);

  // Passwordless login routes (public - no authentication required)
  fastify.post('/api/auth/login/otp/send', { schema: authSchemas.sendLoginOTPSchema }, AuthController.sendLoginOTP);
  fastify.post('/api/auth/login/otp/verify', { schema: authSchemas.loginWithOTPSchema }, AuthController.loginWithOTP);

  // Protected auth routes (require JWT authentication)
  fastify.post('/api/auth/send-otp', { onRequest: [authenticateRoute], schema: authSchemas.sendOTPSchema }, AuthController.sendOTP);
  fastify.post('/api/auth/verify-otp', { onRequest: [authenticateRoute], schema: authSchemas.verifyOTPSchema }, AuthController.verifyOTP);
  fastify.get('/api/auth/me', { onRequest: [authenticateRoute], schema: authSchemas.getCurrentUserSchema }, AuthController.getCurrentUser);
  fastify.put('/api/auth/profile', { onRequest: [authenticateRoute], schema: authSchemas.updateProfileSchema }, AuthController.updateProfile);
  fastify.post('/api/auth/change-password', { onRequest: [authenticateRoute], schema: authSchemas.changePasswordSchema }, AuthController.changePassword);

  // Child Management routes (protected - require tenant header)
  // Note: Register specific routes before parameterized routes
  fastify.post('/api/children', { onRequest: [authenticateRoute], schema: childSchemas.createChildSchema }, ChildController.createChild);
  fastify.get('/api/children', { onRequest: [authenticateRoute], schema: childSchemas.listChildrenSchema }, ChildController.listChildren);
  fastify.get('/api/children/search', { onRequest: [authenticateRoute] }, ChildController.searchChildren);
  fastify.get('/api/children/waitlist', { onRequest: [authenticateRoute] }, ChildController.getWaitlist);
  fastify.get('/api/children/pending', { onRequest: [authenticateRoute] }, ChildController.getPendingApplications);
  fastify.get('/api/children/enrollment-stats', { onRequest: [authenticateRoute] }, ChildController.getEnrollmentStats);
  fastify.post('/api/children/bulk-approve', { onRequest: [authenticateRoute] }, ChildController.bulkApproveApplications);
  fastify.post('/api/children/bulk-enroll', { onRequest: [authenticateRoute] }, ChildController.bulkEnrollChildren);
  fastify.put('/api/children/bulk-active-status', { onRequest: [authenticateRoute] }, ChildController.bulkSetActiveStatus);
  fastify.get('/api/children/:id', { onRequest: [authenticateRoute], schema: childSchemas.getChildSchema }, ChildController.getChild);
  fastify.put('/api/children/:id', { onRequest: [authenticateRoute] }, ChildController.updateChild);
  fastify.delete('/api/children/:id', { onRequest: [authenticateRoute] }, ChildController.deleteChild);

  // Guardian Management routes (legacy - via ChildController)
  fastify.post('/api/children/:childId/guardians', { onRequest: [authenticateRoute], schema: childSchemas.addGuardianSchema }, ChildController.addGuardian);
  fastify.get('/api/children/:childId/guardians', { onRequest: [authenticateRoute] }, ChildController.getGuardians);

  // Guardian Management routes (new - via GuardianController with user accounts)
  // Manager-only routes for creating and managing guardians
  fastify.post('/api/guardians/create-with-user', { onRequest: [authenticateRoute, requireManagerRole] }, GuardianController.createGuardianWithUser);
  fastify.get('/api/guardians', { onRequest: [authenticateRoute, requireManagerRole] }, GuardianController.getAllGuardians);
  fastify.get('/api/guardians/user/:userId', { onRequest: [authenticateRoute, requireManagerRole] }, GuardianController.getGuardiansByUserId);
  fastify.post('/api/guardians/user/:userId/resend-credentials', { onRequest: [authenticateRoute, requireManagerRole] }, GuardianController.resendCredentials);
  fastify.post('/api/guardians/:guardianId/create-user-account', { onRequest: [authenticateRoute, requireManagerRole] }, GuardianController.createUserAccountForLegacyGuardian);
  fastify.get('/api/guardians/children/:childId', { onRequest: [authenticateRoute, requireManagerRole] }, GuardianController.getGuardiansByChild);
  fastify.post('/api/guardians/:userId/link-child', { onRequest: [authenticateRoute, requireManagerRole] }, GuardianController.linkToChild);
  fastify.get('/api/guardians/:id', { onRequest: [authenticateRoute, requireManagerRole] }, GuardianController.getGuardianById);
  fastify.put('/api/guardians/:id', { onRequest: [authenticateRoute, requireManagerRole] }, GuardianController.updateGuardian);
  fastify.delete('/api/guardians/:id/unlink', { onRequest: [authenticateRoute, requireManagerRole] }, GuardianController.unlinkFromChild);
  fastify.delete('/api/guardians/:id', { onRequest: [authenticateRoute, requireManagerRole] }, GuardianController.deleteGuardian);

  // Parent route to get their own children
  fastify.get('/api/guardians/my-children', { onRequest: [authenticateRoute] }, GuardianController.getMyChildren);

  // Enrollment Management routes
  fastify.post('/api/children/:childId/enroll', { onRequest: [authenticateRoute], schema: childSchemas.enrollChildSchema }, ChildController.enrollChild);
  fastify.post('/api/children/:childId/withdraw', { onRequest: [authenticateRoute] }, ChildController.withdrawChild);
  fastify.post('/api/children/:childId/waitlist', { onRequest: [authenticateRoute] }, ChildController.addToWaitlist);
  fastify.post('/api/children/:childId/approve', { onRequest: [authenticateRoute] }, ChildController.approveApplication);
  fastify.post('/api/children/:childId/reject', { onRequest: [authenticateRoute] }, ChildController.rejectApplication);
  fastify.post('/api/children/:childId/promote', { onRequest: [authenticateRoute] }, ChildController.promoteFromWaitlist);
  fastify.put('/api/children/:childId/active-status', { onRequest: [authenticateRoute] }, ChildController.setActiveStatus);

  // QR Code route for children
  fastify.post('/api/children/:childId/generate-qr', { onRequest: [authenticateRoute] }, ChildController.generateQRCode);

  // Child Promotion and History routes
  fastify.post('/api/children/:childId/promote-to-class', { onRequest: [authenticateRoute, requireManagerRole] }, ChildController.promoteToClass);
  fastify.get('/api/children/:childId/eligible-classes', { onRequest: [authenticateRoute] }, ChildController.getEligibleClasses);
  fastify.get('/api/children/:childId/class-history', { onRequest: [authenticateRoute] }, ChildController.getClassHistory);
  fastify.get('/api/children/:childId/full-history', { onRequest: [authenticateRoute] }, ChildController.getFullHistory);

  // Attendance routes (protected - require tenant header)
  // Staff-only routes for recording attendance
  fastify.post('/api/attendance/check-in', { onRequest: [authenticateRoute, requireStaffRole], schema: attendanceSchemas.checkInSchema }, AttendanceController.checkIn);
  fastify.post('/api/attendance/check-out', { onRequest: [authenticateRoute, requireStaffRole], schema: attendanceSchemas.checkOutSchema }, AttendanceController.checkOut);
  fastify.post('/api/attendance/qr-check-in', { onRequest: [authenticateRoute, requireStaffRole] }, AttendanceController.checkInByQRCode);
  fastify.post('/api/attendance/qr-check-out', { onRequest: [authenticateRoute, requireStaffRole] }, AttendanceController.checkOutByQRCode);
  fastify.post('/api/attendance/absence', { onRequest: [authenticateRoute, requireStaffRole], schema: attendanceSchemas.recordAbsenceSchema }, AttendanceController.recordAbsence);

  // Parent and staff can view attendance (with parent child access validation)
  fastify.get('/api/attendance/children/:childId', { onRequest: [authenticateRoute, validateParentChildAccess] }, AttendanceController.getAttendanceByDate);
  fastify.get('/api/attendance/children/:childId/history', { onRequest: [authenticateRoute, validateParentChildAccess], schema: attendanceSchemas.getAttendanceHistorySchema }, AttendanceController.getAttendanceHistory);
  fastify.get('/api/attendance/children/:childId/pattern', { onRequest: [authenticateRoute, validateParentChildAccess] }, AttendanceController.getAttendancePattern);

  // Staff-only routes for summaries
  fastify.get('/api/attendance/summary', { onRequest: [authenticateRoute, requireStaffRole], schema: attendanceSchemas.getDailyAttendanceSummarySchema }, AttendanceController.getDailyAttendanceSummary);
  fastify.get('/api/attendance/classes/:classId', { onRequest: [authenticateRoute, requireStaffRole] }, AttendanceController.getClassAttendance);
  fastify.get('/api/attendance/centers/:centerId', { onRequest: [authenticateRoute, requireStaffRole] }, AttendanceController.getCenterAttendance);

  // Secure checkout with OTP verification (staff only)
  fastify.post('/api/attendance/secure-checkout/initiate', { onRequest: [authenticateRoute, requireStaffRole] }, AttendanceController.initiateSecureCheckout);
  fastify.post('/api/attendance/secure-checkout/qr/initiate', { onRequest: [authenticateRoute, requireStaffRole] }, AttendanceController.initiateSecureCheckoutByQR);
  fastify.post('/api/attendance/secure-checkout/verify', { onRequest: [authenticateRoute, requireStaffRole] }, AttendanceController.verifySecureCheckout);
  fastify.post('/api/attendance/secure-checkout/:pendingCheckoutId/resend', { onRequest: [authenticateRoute, requireStaffRole] }, AttendanceController.resendCheckoutOTP);
  fastify.post('/api/attendance/secure-checkout/:pendingCheckoutId/cancel', { onRequest: [authenticateRoute, requireStaffRole] }, AttendanceController.cancelPendingCheckout);
  fastify.get('/api/attendance/secure-checkout/:pendingCheckoutId', { onRequest: [authenticateRoute, requireStaffRole] }, AttendanceController.getPendingCheckout);

  // Activity Log routes (protected - require tenant header)
  // Staff-only routes for logging activities
  fastify.post('/api/activities/meal', { onRequest: [authenticateRoute, requireStaffRole], schema: activitySchemas.logMealSchema }, ActivityLogController.logMeal);
  fastify.post('/api/activities/nap', { onRequest: [authenticateRoute, requireStaffRole], schema: activitySchemas.logNapSchema }, ActivityLogController.logNap);
  fastify.post('/api/activities/diaper', { onRequest: [authenticateRoute, requireStaffRole], schema: activitySchemas.logDiaperChangeSchema }, ActivityLogController.logDiaperChange);
  fastify.post('/api/activities/learning', { onRequest: [authenticateRoute, requireStaffRole], schema: activitySchemas.logLearningActivitySchema }, ActivityLogController.logLearningActivity);
  fastify.post('/api/activities/outdoor-play', { onRequest: [authenticateRoute, requireStaffRole] }, ActivityLogController.logOutdoorPlay);
  fastify.post('/api/activities/medication', { onRequest: [authenticateRoute, requireStaffRole] }, ActivityLogController.logMedication);

  // Parent and staff can view activities (with parent child access validation)
  fastify.get('/api/activities/:id', { onRequest: [authenticateRoute], schema: activitySchemas.getActivityByIdSchema }, ActivityLogController.getActivityById);
  fastify.get('/api/activities/children/:childId/daily', { onRequest: [authenticateRoute, validateParentChildAccess], schema: activitySchemas.getDailyActivitiesSchema }, ActivityLogController.getDailyActivities);
  fastify.get('/api/activities/children/:childId/history', { onRequest: [authenticateRoute, validateParentChildAccess] }, ActivityLogController.getActivityHistory);
  fastify.get('/api/activities/children/:childId/daily-report', { onRequest: [authenticateRoute, validateParentChildAccess], schema: activitySchemas.getDailyReportSchema }, ActivityLogController.getDailyReport);
  fastify.get('/api/activities/children/:childId/enhanced-daily-summary', { onRequest: [authenticateRoute, validateParentChildAccess] }, ActivityLogController.getEnhancedDailySummary);
  fastify.get('/api/activities/children/:childId/weekly-summary', { onRequest: [authenticateRoute, validateParentChildAccess] }, ActivityLogController.getWeeklySummary);
  fastify.get('/api/activities/children/:childId/photos', { onRequest: [authenticateRoute, validateParentChildAccess] }, ActivityLogController.getPhotoGallery);

  // Staff-only routes for updating activities
  fastify.patch('/api/activities/:id/mood', { onRequest: [authenticateRoute, requireStaffRole] }, ActivityLogController.updateMood);

  // Teacher class dashboard routes (staff only)
  fastify.get('/api/activities/classes/:classId/dashboard', { onRequest: [authenticateRoute, requireStaffRole] }, ActivityLogController.getTeacherClassDashboard);
  fastify.get('/api/activities/classes/:classId/summary', { onRequest: [authenticateRoute, requireStaffRole] }, ActivityLogController.getClassActivitySummary);

  // Notification routes (protected - require tenant header)
  fastify.post('/api/notifications/test-sms', { onRequest: [authenticateRoute], schema: notificationSchemas.sendTestSMSSchema }, NotificationController.sendTestSMS);
  fastify.post('/api/notifications/send-otp', { onRequest: [authenticateRoute] }, NotificationController.sendOTP);
  fastify.post('/api/notifications/check-in', { onRequest: [authenticateRoute], schema: notificationSchemas.sendCheckInNotificationSchema }, NotificationController.sendCheckInNotification);
  fastify.post('/api/notifications/check-out', { onRequest: [authenticateRoute] }, NotificationController.sendCheckOutNotification);
  fastify.post('/api/notifications/daily-report', { onRequest: [authenticateRoute] }, NotificationController.sendDailyReportNotification);
  fastify.post('/api/notifications/payment-reminder', { onRequest: [authenticateRoute] }, NotificationController.sendPaymentReminder);
  fastify.post('/api/notifications/emergency-broadcast', { onRequest: [authenticateRoute] }, NotificationController.sendEmergencyBroadcast);
  fastify.get('/api/notifications/balance', { onRequest: [authenticateRoute], schema: notificationSchemas.checkBalanceSchema }, NotificationController.checkBalance);

  // File Upload routes (using ImageKit - protected, require tenant header)
  fastify.post('/api/uploads/photo', { onRequest: [authenticateRoute], schema: notificationSchemas.uploadPhotoSchema }, FileUploadController.uploadPhoto);
  fastify.post('/api/uploads/photos', { onRequest: [authenticateRoute] }, FileUploadController.uploadPhotos);
  fastify.post('/api/uploads/document', { onRequest: [authenticateRoute] }, FileUploadController.uploadDocument);
  fastify.post('/api/uploads/video', { onRequest: [authenticateRoute] }, FileUploadController.uploadVideo);
  fastify.post('/api/uploads/voice-note', { onRequest: [authenticateRoute] }, FileUploadController.uploadVoiceNote);
  fastify.delete('/api/uploads/file', { onRequest: [authenticateRoute] }, FileUploadController.deleteFile);
  fastify.post('/api/uploads/auth', { onRequest: [authenticateRoute] }, FileUploadController.getAuthParameters);
  fastify.post('/api/uploads/presigned-url', { onRequest: [authenticateRoute], schema: notificationSchemas.getPresignedUrlSchema }, FileUploadController.getPresignedUrl);

  // Center Management routes (protected - require tenant header)
  fastify.post('/api/centers', { onRequest: [authenticateRoute], schema: centerSchemas.createCenterSchema }, CenterController.createCenter);
  fastify.get('/api/centers', { onRequest: [authenticateRoute], schema: centerSchemas.getCentersSchema }, CenterController.getCenters);
  fastify.get('/api/centers/:id/stats', { onRequest: [authenticateRoute] }, CenterController.getCenterStats);
  fastify.get('/api/centers/:id', { onRequest: [authenticateRoute] }, CenterController.getCenterById);
  fastify.put('/api/centers/:id', { onRequest: [authenticateRoute] }, CenterController.updateCenter);
  fastify.post('/api/centers/:id/activate', { onRequest: [authenticateRoute] }, CenterController.activateCenter);
  fastify.post('/api/centers/:id/deactivate', { onRequest: [authenticateRoute] }, CenterController.deactivateCenter);
  fastify.delete('/api/centers/:id', { onRequest: [authenticateRoute] }, CenterController.deleteCenter);

  // Class Management routes (protected - require tenant header)
  fastify.post('/api/classes', { onRequest: [authenticateRoute], schema: centerSchemas.createClassSchema }, ClassController.createClass);
  fastify.get('/api/classes', { onRequest: [authenticateRoute], schema: centerSchemas.getClassesSchema }, ClassController.getClasses);
  fastify.get('/api/classes/:id/capacity', { onRequest: [authenticateRoute] }, ClassController.getCapacityInfo);
  fastify.get('/api/classes/:id/children', { onRequest: [authenticateRoute] }, ClassController.getClassChildren);
  fastify.get('/api/classes/:id', { onRequest: [authenticateRoute] }, ClassController.getClassById);
  fastify.put('/api/classes/:id', { onRequest: [authenticateRoute] }, ClassController.updateClass);
  fastify.post('/api/classes/:id/activate', { onRequest: [authenticateRoute] }, ClassController.activateClass);
  fastify.post('/api/classes/:id/deactivate', { onRequest: [authenticateRoute] }, ClassController.deactivateClass);
  fastify.delete('/api/classes/:id', { onRequest: [authenticateRoute] }, ClassController.deleteClass);
  fastify.post('/api/classes/:id/teachers', { onRequest: [authenticateRoute] }, ClassController.addTeacher);
  fastify.delete('/api/classes/:id/teachers/:teacherId', { onRequest: [authenticateRoute] }, ClassController.removeTeacher);

  // Educational Portfolio - Milestone routes (protected - require tenant header)
  fastify.post('/api/milestones', { onRequest: [authenticateRoute], schema: milestoneSchemas.createMilestoneSchema }, MilestoneController.createMilestone);
  fastify.get('/api/milestones/children/:childId', { onRequest: [authenticateRoute], schema: milestoneSchemas.getMilestonesByChildSchema }, MilestoneController.getMilestonesByChild);
  fastify.get('/api/milestones/children/:childId/summary', { onRequest: [authenticateRoute] }, MilestoneController.getMilestoneSummary);
  fastify.get('/api/milestones/children/:childId/delayed', { onRequest: [authenticateRoute] }, MilestoneController.getDelayedMilestones);
  fastify.get('/api/milestones/children/:childId/category/:category', { onRequest: [authenticateRoute] }, MilestoneController.getMilestonesByCategory);
  fastify.put('/api/milestones/:id', { onRequest: [authenticateRoute] }, MilestoneController.updateMilestone);
  fastify.post('/api/milestones/:id/achieve', { onRequest: [authenticateRoute] }, MilestoneController.markAsAchieved);
  fastify.delete('/api/milestones/:id', { onRequest: [authenticateRoute] }, MilestoneController.deleteMilestone);

  // Educational Portfolio - Assessment routes (protected - require tenant header)
  fastify.post('/api/assessments', { onRequest: [authenticateRoute], schema: milestoneSchemas.createAssessmentSchema }, AssessmentController.createAssessment);
  fastify.get('/api/assessments/children/:childId', { onRequest: [authenticateRoute] }, AssessmentController.getAssessmentsByChild);
  fastify.get('/api/assessments/children/:childId/summary', { onRequest: [authenticateRoute] }, AssessmentController.getAssessmentSummary);
  fastify.get('/api/assessments/children/:childId/progress/:type', { onRequest: [authenticateRoute] }, AssessmentController.getAssessmentProgress);
  fastify.get('/api/assessments/:id', { onRequest: [authenticateRoute] }, AssessmentController.getAssessmentById);
  fastify.put('/api/assessments/:id', { onRequest: [authenticateRoute] }, AssessmentController.updateAssessment);
  fastify.delete('/api/assessments/:id', { onRequest: [authenticateRoute] }, AssessmentController.deleteAssessment);

  // Educational Portfolio - Progress Report routes (protected - require tenant header)
  fastify.post('/api/progress-reports', { onRequest: [authenticateRoute], schema: milestoneSchemas.generateProgressReportSchema }, ProgressReportController.generateProgressReport);
  fastify.post('/api/progress-reports/bulk', { onRequest: [authenticateRoute] }, ProgressReportController.generateBulkReports);
  fastify.get('/api/progress-reports/children/:childId', { onRequest: [authenticateRoute] }, ProgressReportController.getProgressReportsByChild);
  fastify.get('/api/progress-reports/children/:childId/statistics', { onRequest: [authenticateRoute] }, ProgressReportController.getReportStatistics);
  fastify.get('/api/progress-reports/:id', { onRequest: [authenticateRoute] }, ProgressReportController.getProgressReportById);
  fastify.put('/api/progress-reports/:id', { onRequest: [authenticateRoute] }, ProgressReportController.updateProgressReport);
  fastify.post('/api/progress-reports/:id/share', { onRequest: [authenticateRoute] }, ProgressReportController.shareWithParent);
  fastify.delete('/api/progress-reports/:id', { onRequest: [authenticateRoute] }, ProgressReportController.deleteProgressReport);

  // Staff Management - Staff Profile routes (protected - require tenant header)
  fastify.post('/api/staff/create-with-user', { onRequest: [authenticateRoute] }, StaffController.createStaffWithUser);
  fastify.post('/api/staff', { onRequest: [authenticateRoute], schema: staffSchemas.createStaffProfileSchema }, StaffController.createStaffProfile);
  fastify.get('/api/staff', { onRequest: [authenticateRoute], schema: staffSchemas.getAllStaffSchema }, StaffController.getAllStaff);
  fastify.get('/api/staff/statistics', { onRequest: [authenticateRoute] }, StaffController.getStaffStatistics);
  fastify.get('/api/staff/employee/:employeeId', { onRequest: [authenticateRoute] }, StaffController.getStaffByEmployeeId);
  fastify.get('/api/staff/user/:userId', { onRequest: [authenticateRoute] }, StaffController.getStaffByUserId);
  fastify.get('/api/staff/centers/:centerId', { onRequest: [authenticateRoute] }, StaffController.getStaffByCenter);
  // Staff Permission routes (must be before :id routes to avoid conflicts)
  fastify.get('/api/staff/permissions/available', { onRequest: [authenticateRoute] }, StaffController.getAvailablePermissions);
  fastify.get('/api/staff/permissions/defaults/:role', { onRequest: [authenticateRoute] }, StaffController.getDefaultPermissionsForRole);
  fastify.get('/api/staff/:id', { onRequest: [authenticateRoute] }, StaffController.getStaffById);
  fastify.put('/api/staff/:id', { onRequest: [authenticateRoute] }, StaffController.updateStaffProfile);
  fastify.post('/api/staff/:id/terminate', { onRequest: [authenticateRoute] }, StaffController.terminateStaff);
  fastify.post('/api/staff/:id/reactivate', { onRequest: [authenticateRoute] }, StaffController.reactivateStaff);
  fastify.post('/api/staff/:id/assign-center', { onRequest: [authenticateRoute] }, StaffController.assignToCenter);
  fastify.post('/api/staff/:id/assign-class', { onRequest: [authenticateRoute] }, StaffController.assignToClass);
  fastify.post('/api/staff/:id/generate-qr', { onRequest: [authenticateRoute] }, StaffController.generateQRCode);
  fastify.post('/api/staff/:id/update-salary', { onRequest: [authenticateRoute] }, StaffController.updateSalary);
  fastify.delete('/api/staff/:id', { onRequest: [authenticateRoute] }, StaffController.deleteStaff);

  // Staff Permission Management routes (protected - admin only)
  fastify.get('/api/staff/:id/permissions', { onRequest: [authenticateRoute] }, StaffController.getStaffPermissions);
  fastify.put('/api/staff/:id/permissions', { onRequest: [authenticateRoute] }, StaffController.updateStaffPermissions);
  fastify.post('/api/staff/:id/permissions/reset', { onRequest: [authenticateRoute] }, StaffController.resetStaffPermissions);

  // Staff Management - Certification routes (protected - require tenant header)
  fastify.post('/api/certifications', { onRequest: [authenticateRoute], schema: staffSchemas.createCertificationSchema }, CertificationController.createCertification);
  fastify.get('/api/certifications/statistics', { onRequest: [authenticateRoute] }, CertificationController.getCertificationStatistics);
  fastify.get('/api/certifications/expiring', { onRequest: [authenticateRoute], schema: staffSchemas.getExpiringCertificationsSchema }, CertificationController.getExpiringCertifications);
  fastify.get('/api/certifications/expired', { onRequest: [authenticateRoute] }, CertificationController.getExpiredCertifications);
  fastify.get('/api/certifications/staff/:staffId', { onRequest: [authenticateRoute] }, CertificationController.getCertificationsByStaff);
  fastify.get('/api/certifications/staff/:staffId/summary', { onRequest: [authenticateRoute] }, CertificationController.getCertificationSummary);
  fastify.get('/api/certifications/type/:type', { onRequest: [authenticateRoute] }, CertificationController.getCertificationsByType);
  fastify.get('/api/certifications/status/:status', { onRequest: [authenticateRoute] }, CertificationController.getCertificationsByStatus);
  fastify.get('/api/certifications/:id', { onRequest: [authenticateRoute] }, CertificationController.getCertificationById);
  fastify.put('/api/certifications/:id', { onRequest: [authenticateRoute] }, CertificationController.updateCertification);
  fastify.post('/api/certifications/:id/renew', { onRequest: [authenticateRoute] }, CertificationController.renewCertification);
  fastify.post('/api/certifications/update-statuses', { onRequest: [authenticateRoute] }, CertificationController.updateAllStatuses);
  fastify.delete('/api/certifications/:id', { onRequest: [authenticateRoute] }, CertificationController.deleteCertification);

  // Staff Management - Shift routes (protected - require tenant header)
  fastify.post('/api/shifts', { onRequest: [authenticateRoute], schema: staffSchemas.createShiftSchema }, ShiftController.createShift);
  fastify.post('/api/shifts/bulk', { onRequest: [authenticateRoute] }, ShiftController.createBulkShifts);
  fastify.get('/api/shifts/statistics', { onRequest: [authenticateRoute] }, ShiftController.getShiftStatistics);
  fastify.get('/api/shifts/staff/:staffId', { onRequest: [authenticateRoute] }, ShiftController.getShiftsByStaff);
  fastify.get('/api/shifts/staff/:staffId/upcoming', { onRequest: [authenticateRoute] }, ShiftController.getUpcomingShifts);
  fastify.get('/api/shifts/centers/:centerId', { onRequest: [authenticateRoute] }, ShiftController.getShiftsByCenter);
  fastify.get('/api/shifts/date/:date', { onRequest: [authenticateRoute] }, ShiftController.getShiftsByDate);
  fastify.get('/api/shifts/:id', { onRequest: [authenticateRoute] }, ShiftController.getShiftById);
  fastify.put('/api/shifts/:id', { onRequest: [authenticateRoute] }, ShiftController.updateShift);
  fastify.post('/api/shifts/:id/clock-in', { onRequest: [authenticateRoute] }, ShiftController.clockIn);
  fastify.post('/api/shifts/:id/clock-out', { onRequest: [authenticateRoute] }, ShiftController.clockOut);
  fastify.post('/api/shifts/:id/cancel', { onRequest: [authenticateRoute] }, ShiftController.cancelShift);
  fastify.post('/api/shifts/:id/no-show', { onRequest: [authenticateRoute] }, ShiftController.markNoShow);
  fastify.delete('/api/shifts/:id', { onRequest: [authenticateRoute] }, ShiftController.deleteShift);

  // Staff Management - Staff Attendance routes (protected - require tenant header)
  fastify.post('/api/staff-attendance/qr-check-in', { onRequest: [authenticateRoute] }, StaffAttendanceController.qrCheckIn);
  fastify.post('/api/staff-attendance/qr-check-out', { onRequest: [authenticateRoute] }, StaffAttendanceController.qrCheckOut);
  fastify.post('/api/staff-attendance/check-in', { onRequest: [authenticateRoute], schema: staffSchemas.recordStaffCheckInSchema }, StaffAttendanceController.recordCheckIn);
  fastify.post('/api/staff-attendance/mark-absent', { onRequest: [authenticateRoute] }, StaffAttendanceController.markAbsent);
  fastify.post('/api/staff-attendance/mark-leave', { onRequest: [authenticateRoute] }, StaffAttendanceController.markOnLeave);
  fastify.post('/api/staff-attendance/bulk', { onRequest: [authenticateRoute] }, StaffAttendanceController.bulkCreateAttendance);
  fastify.get('/api/staff-attendance/late-arrivals', { onRequest: [authenticateRoute] }, StaffAttendanceController.getLateArrivals);
  fastify.get('/api/staff-attendance/overtime', { onRequest: [authenticateRoute] }, StaffAttendanceController.getOvertimeRecords);
  fastify.get('/api/staff-attendance/staff/:staffId', { onRequest: [authenticateRoute] }, StaffAttendanceController.getAttendanceByStaff);
  fastify.get('/api/staff-attendance/staff/:staffId/date/:date', { onRequest: [authenticateRoute] }, StaffAttendanceController.getAttendanceByStaffAndDate);
  fastify.get('/api/staff-attendance/staff/:staffId/statistics', { onRequest: [authenticateRoute] }, StaffAttendanceController.getStaffAttendanceStatistics);
  fastify.get('/api/staff-attendance/date/:date', { onRequest: [authenticateRoute] }, StaffAttendanceController.getAttendanceByDate);
  fastify.get('/api/staff-attendance/summary/date/:date', { onRequest: [authenticateRoute] }, StaffAttendanceController.getDailyAttendanceSummary);
  fastify.get('/api/staff-attendance/:id', { onRequest: [authenticateRoute] }, StaffAttendanceController.getAttendanceById);
  fastify.post('/api/staff-attendance/:id/check-out', { onRequest: [authenticateRoute] }, StaffAttendanceController.recordCheckOut);
  fastify.put('/api/staff-attendance/:id', { onRequest: [authenticateRoute] }, StaffAttendanceController.updateAttendance);
  fastify.delete('/api/staff-attendance/:id', { onRequest: [authenticateRoute] }, StaffAttendanceController.deleteAttendance);

  // Analytics - Attendance routes (protected - require tenant header)
  fastify.get('/api/analytics/attendance/trends', { onRequest: [authenticateRoute], schema: analyticsSchemas.getAttendanceTrendsSchema }, AnalyticsController.getAttendanceTrends);
  fastify.get('/api/analytics/attendance/by-class', { onRequest: [authenticateRoute], schema: analyticsSchemas.getAttendanceByClassSchema }, AnalyticsController.getAttendanceByClass);

  // Analytics - Enrollment routes (protected - require tenant header)
  fastify.get('/api/analytics/enrollment/trends', { onRequest: [authenticateRoute], schema: analyticsSchemas.getEnrollmentTrendsSchema }, AnalyticsController.getEnrollmentTrends);
  fastify.get('/api/analytics/enrollment/demographics', { onRequest: [authenticateRoute], schema: analyticsSchemas.getEnrollmentDemographicsSchema }, AnalyticsController.getEnrollmentDemographics);
  fastify.get('/api/analytics/enrollment/retention', { onRequest: [authenticateRoute], schema: analyticsSchemas.getRetentionRateSchema }, AnalyticsController.getRetentionRate);

  // Analytics - Staff routes (protected - require tenant header)
  fastify.get('/api/analytics/staff', { onRequest: [authenticateRoute], schema: analyticsSchemas.getStaffAnalyticsSchema }, AnalyticsController.getStaffAnalytics);

  // Analytics - Dashboard routes (protected - require tenant header)
  fastify.get('/api/analytics/dashboard', { onRequest: [authenticateRoute], schema: analyticsSchemas.getDashboardSummarySchema }, AnalyticsController.getDashboardSummary);

  // Reports - Report management routes (protected - require tenant header)
  fastify.post('/api/reports/generate', { onRequest: [authenticateRoute], schema: reportSchemas.generateReportSchema }, ReportController.generateReport);
  fastify.get('/api/reports', { onRequest: [authenticateRoute], schema: reportSchemas.getReportsSchema }, ReportController.getReports);
  fastify.get('/api/reports/recent', { onRequest: [authenticateRoute], schema: reportSchemas.getRecentReportsSchema }, ReportController.getRecentReports);
  fastify.get('/api/reports/statistics', { onRequest: [authenticateRoute], schema: reportSchemas.getReportStatisticsSchema }, ReportController.getReportStatistics);
  fastify.get('/api/reports/:id', { onRequest: [authenticateRoute], schema: reportSchemas.getReportByIdSchema }, ReportController.getReportById);
  fastify.delete('/api/reports/:id', { onRequest: [authenticateRoute], schema: reportSchemas.deleteReportSchema }, ReportController.deleteReport);

  // Invoice Management routes (protected - require tenant header)
  // Manager-only routes for creating and managing invoices
  fastify.post('/api/invoices', { onRequest: [authenticateRoute, requireManagerRole] }, invoiceController.createInvoice.bind(invoiceController));
  fastify.get('/api/invoices', { onRequest: [authenticateRoute, requireStaffRole] }, invoiceController.getInvoices.bind(invoiceController));
  fastify.get('/api/invoices/stats', { onRequest: [authenticateRoute, requireManagerRole] }, invoiceController.getInvoiceStats.bind(invoiceController));
  fastify.get('/api/invoices/overdue', { onRequest: [authenticateRoute, requireManagerRole] }, invoiceController.getOverdueInvoices.bind(invoiceController));
  fastify.get('/api/invoices/pending', { onRequest: [authenticateRoute, requireManagerRole] }, invoiceController.getPendingInvoices.bind(invoiceController));
  fastify.get('/api/invoices/number/:invoiceNumber', { onRequest: [authenticateRoute, requireStaffRole] }, invoiceController.getInvoiceByNumber.bind(invoiceController));
  fastify.get('/api/invoices/child/:childId', { onRequest: [authenticateRoute, requireStaffRole] }, invoiceController.getChildInvoices.bind(invoiceController));
  fastify.get('/api/invoices/:id', { onRequest: [authenticateRoute, requireStaffRole] }, invoiceController.getInvoiceById.bind(invoiceController));
  fastify.put('/api/invoices/:id', { onRequest: [authenticateRoute, requireManagerRole] }, invoiceController.updateInvoice.bind(invoiceController));
  fastify.post('/api/invoices/:id/late-fee', { onRequest: [authenticateRoute, requireManagerRole] }, invoiceController.addLateFee.bind(invoiceController));
  fastify.post('/api/invoices/:id/cancel', { onRequest: [authenticateRoute, requireManagerRole] }, invoiceController.cancelInvoice.bind(invoiceController));
  fastify.delete('/api/invoices/:id', { onRequest: [authenticateRoute, requireManagerRole] }, invoiceController.deleteInvoice.bind(invoiceController));

  // Payment Management routes (protected - require tenant header)
  // Public webhook route (no authentication)
  fastify.post('/api/payments/webhook', paymentController.handleWebhook.bind(paymentController));

  // Manager and staff routes for payment management
  fastify.post('/api/payments', { onRequest: [authenticateRoute, requireStaffRole] }, paymentController.createPayment.bind(paymentController));
  fastify.post('/api/payments/initiate', { onRequest: [authenticateRoute] }, paymentController.initiateOnlinePayment.bind(paymentController));
  fastify.get('/api/payments/verify/:reference', { onRequest: [authenticateRoute] }, paymentController.verifyPayment.bind(paymentController));
  fastify.get('/api/payments/config', { onRequest: [authenticateRoute] }, paymentController.getPaymentConfig.bind(paymentController));
  fastify.get('/api/payments', { onRequest: [authenticateRoute, requireStaffRole] }, paymentController.getPayments.bind(paymentController));
  fastify.get('/api/payments/stats', { onRequest: [authenticateRoute, requireManagerRole] }, paymentController.getPaymentStats.bind(paymentController));
  fastify.get('/api/payments/reference/:reference', { onRequest: [authenticateRoute, requireStaffRole] }, paymentController.getPaymentByReference.bind(paymentController));
  fastify.get('/api/payments/invoice/:invoiceId', { onRequest: [authenticateRoute, requireStaffRole] }, paymentController.getInvoicePayments.bind(paymentController));
  fastify.get('/api/payments/:id', { onRequest: [authenticateRoute, requireStaffRole] }, paymentController.getPaymentById.bind(paymentController));
  fastify.put('/api/payments/:id/status', { onRequest: [authenticateRoute, requireManagerRole] }, paymentController.updatePaymentStatus.bind(paymentController));
  fastify.post('/api/payments/:id/refund', { onRequest: [authenticateRoute, requireManagerRole] }, paymentController.refundPayment.bind(paymentController));
  fastify.delete('/api/payments/:id', { onRequest: [authenticateRoute, requireManagerRole] }, paymentController.deletePayment.bind(paymentController));

  // Tenant Payment Settings routes (for schools to receive payments)
  fastify.get('/api/tenant-payment/banks', { onRequest: [authenticateRoute, requireManagerRole] }, tenantPaymentController.getSupportedBanks.bind(tenantPaymentController));
  fastify.post('/api/tenant-payment/verify-account', { onRequest: [authenticateRoute, requireManagerRole] }, tenantPaymentController.verifyBankAccount.bind(tenantPaymentController));
  fastify.post('/api/tenant-payment/setup', { onRequest: [authenticateRoute, requireManagerRole] }, tenantPaymentController.setupPaymentSettings.bind(tenantPaymentController));
  fastify.get('/api/tenant-payment/settings', { onRequest: [authenticateRoute, requireManagerRole] }, tenantPaymentController.getPaymentSettings.bind(tenantPaymentController));
  fastify.put('/api/tenant-payment/settings', { onRequest: [authenticateRoute, requireManagerRole] }, tenantPaymentController.updatePaymentSettings.bind(tenantPaymentController));
  fastify.get('/api/tenant-payment/platform-status', { onRequest: [authenticateRoute] }, tenantPaymentController.getPlatformPaymentStatus.bind(tenantPaymentController));

  // Subscription Management routes (protected - require tenant header)
  // Public route for viewing plans
  fastify.get('/api/subscriptions/plans', subscriptionController.getPlans.bind(subscriptionController));

  // Manager routes for subscription management
  fastify.get('/api/subscriptions/current', { onRequest: [authenticateRoute, requireManagerRole] }, subscriptionController.getCurrentSubscription.bind(subscriptionController));
  fastify.get('/api/subscriptions/history', { onRequest: [authenticateRoute, requireManagerRole] }, subscriptionController.getSubscriptionHistory.bind(subscriptionController));
  fastify.post('/api/subscriptions/upgrade', { onRequest: [authenticateRoute, requireManagerRole] }, subscriptionController.upgradeSubscription.bind(subscriptionController));
  fastify.post('/api/subscriptions/renew', { onRequest: [authenticateRoute, requireManagerRole] }, subscriptionController.renewSubscription.bind(subscriptionController));
  fastify.post('/api/subscriptions/cancel', { onRequest: [authenticateRoute, requireManagerRole] }, subscriptionController.cancelSubscription.bind(subscriptionController));
  fastify.put('/api/subscriptions/auto-renew', { onRequest: [authenticateRoute, requireManagerRole] }, subscriptionController.updateAutoRenew.bind(subscriptionController));
  fastify.get('/api/subscriptions/validate', { onRequest: [authenticateRoute, requireManagerRole] }, subscriptionController.validateSubscription.bind(subscriptionController));

  // One-time endpoint to create trial for existing tenants
  fastify.post('/api/subscriptions/create-trial', { onRequest: [authenticateRoute, requireManagerRole] }, subscriptionController.createTrialForExistingTenant.bind(subscriptionController));

  // Debug endpoint to check all subscriptions
  fastify.get('/api/subscriptions/debug', { onRequest: [authenticateRoute, requireManagerRole] }, subscriptionController.debugSubscriptions.bind(subscriptionController));

  // Media Management routes (ImageKit integration)
  // Authentication for client-side uploads
  fastify.get('/api/media/auth', { onRequest: [authenticateRoute] }, mediaController.getAuthParams.bind(mediaController));
  fastify.get('/api/media/config', { onRequest: [authenticateRoute] }, mediaController.getConfig.bind(mediaController));

  // Server-side upload routes
  fastify.post('/api/media/upload', { onRequest: [authenticateRoute] }, mediaController.uploadFile.bind(mediaController));
  fastify.post('/api/media/upload-multiple', { onRequest: [authenticateRoute] }, mediaController.uploadMultipleFiles.bind(mediaController));

  // File management routes
  fastify.get('/api/media/list', { onRequest: [authenticateRoute] }, mediaController.listFiles.bind(mediaController));
  fastify.post('/api/media/url', { onRequest: [authenticateRoute] }, mediaController.getOptimizedUrl.bind(mediaController));
  fastify.get('/api/media/:fileId', { onRequest: [authenticateRoute] }, mediaController.getFileDetails.bind(mediaController));
  fastify.delete('/api/media/:fileId', { onRequest: [authenticateRoute, requireManagerRole] }, mediaController.deleteFile.bind(mediaController));
  fastify.post('/api/media/delete-multiple', { onRequest: [authenticateRoute, requireManagerRole] }, mediaController.deleteMultipleFiles.bind(mediaController));

  // Specialized upload routes
  fastify.post('/api/media/child/:childId/photo', { onRequest: [authenticateRoute, requireStaffRole] }, mediaController.uploadChildPhoto.bind(mediaController));
  fastify.post('/api/media/staff/:staffId/photo', { onRequest: [authenticateRoute, requireManagerRole] }, mediaController.uploadStaffPhoto.bind(mediaController));
  fastify.post('/api/media/activity/:activityId', { onRequest: [authenticateRoute, requireStaffRole] }, mediaController.uploadActivityMedia.bind(mediaController));

  // Admin routes
  fastify.post('/api/media/initialize-folders', { onRequest: [authenticateRoute, requireManagerRole] }, mediaController.initializeFolders.bind(mediaController));

  // Error handling
  fastify.setErrorHandler(async (error: any, request, reply) => {
    fastify.log.error(error);
    return reply.status(500).send({
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  });

  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      success: false,
      error: 'Endpoint not found',
      timestamp: new Date().toISOString(),
    });
  });
}

/**
 * Start server
 */
async function start() {
  try {
    // Initialize database
    await initializeDatabase();
    console.log('✓ Database connected');

    // Register plugins
    await registerPlugins();
    console.log('✓ Plugins registered');

    // Register routes
    await registerRoutes();
    console.log('✓ Routes registered');

    // Start server
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`✓ Server running on http://0.0.0.0:${config.port}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

// Start the application
start();

export default fastify;
