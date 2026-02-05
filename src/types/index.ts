// Request context type - contains authenticated user and tenant information
export interface RequestContext {
  tenantId: string;
  userId: string;
  centerId: string;
  classId?: string; // Staff member's assigned class (from StaffProfile)
  role: UserRole;
  permissions: string[];
}

// Legacy alias for backwards compatibility
export type TenantContext = RequestContext;

// User roles in the system
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  CENTER_OWNER = 'center_owner',
  DIRECTOR = 'director',
  TEACHER = 'teacher',
  STAFF = 'staff',
  PARENT = 'parent',
}

// Child enrollment status
export enum EnrollmentStatus {
  PENDING = 'pending',           // Application submitted, awaiting review
  APPROVED = 'approved',         // Application approved, awaiting enrollment
  ENROLLED = 'enrolled',         // Currently enrolled
  WAITLIST = 'waitlist',         // On waitlist
  WITHDRAWN = 'withdrawn',       // Withdrawn from center
  REJECTED = 'rejected',         // Application rejected
  INACTIVE = 'inactive',         // Temporarily inactive (e.g., on leave)
}

// Attendance status
export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  EARLY_PICKUP = 'early_pickup',
  ON_LEAVE = 'on_leave',
}

// Activity meal status
export enum MealStatus {
  ALL = 'all',
  MOST = 'most',
  SOME = 'some',
  NONE = 'none',
}

// Message types
export enum MessageType {
  TEXT = 'text',
  VOICE = 'voice',
  IMAGE = 'image',
  FILE = 'file',
}

// Milestone categories
export enum MilestoneCategory {
  PHYSICAL = 'physical',           // Gross/fine motor skills
  COGNITIVE = 'cognitive',         // Problem solving, thinking
  SOCIAL = 'social',               // Interactions with others
  EMOTIONAL = 'emotional',         // Feelings, self-regulation
  LANGUAGE = 'language',           // Speech, communication
}

// Assessment types
export enum AssessmentType {
  DEVELOPMENTAL = 'developmental', // Overall development assessment
  BEHAVIORAL = 'behavioral',       // Behavior evaluation
  ACADEMIC = 'academic',           // Learning progress
  HEALTH = 'health',               // Health screening
}

// Staff positions
export enum StaffPosition {
  DIRECTOR = 'director',
  TEACHER = 'teacher',
  ASSISTANT_TEACHER = 'assistant_teacher',
  NURSE = 'nurse',
  COOK = 'cook',
  JANITOR = 'janitor',
  ADMINISTRATOR = 'administrator',
  SUPPORT_STAFF = 'support_staff',
  ACCOUNTANT = 'accountant',
}

// Staff Permissions - Granular permissions for staff members
export enum StaffPermission {
  // Children Management
  VIEW_ALL_CHILDREN = 'view_all_children',           // Can view all children (not just assigned class)
  VIEW_CLASS_CHILDREN = 'view_class_children',       // Can view children in assigned class only
  CREATE_CHILDREN = 'create_children',               // Can add new children
  EDIT_CHILDREN = 'edit_children',                   // Can edit children's information
  DELETE_CHILDREN = 'delete_children',               // Can delete children
  MANAGE_CHILDREN = 'manage_children',               // Full access: add/edit/delete children (legacy, grants all)

  // Activity Logging
  LOG_ACTIVITIES = 'log_activities',                 // Can log activities (meals, naps, etc.)
  VIEW_ACTIVITIES = 'view_activities',               // Can view activity logs

  // Attendance
  MANAGE_ATTENDANCE = 'manage_attendance',           // Can check-in/check-out children
  VIEW_ATTENDANCE = 'view_attendance',               // Can view attendance records

  // Billing & Payments
  VIEW_BILLING = 'view_billing',                     // Can view invoices and payments
  MANAGE_BILLING = 'manage_billing',                 // Can create/edit invoices
  RECEIVE_PAYMENTS = 'receive_payments',             // Can record cash payments

  // Messaging
  SEND_MESSAGES = 'send_messages',                   // Can send messages to parents
  VIEW_MESSAGES = 'view_messages',                   // Can view message history

  // Reports
  VIEW_REPORTS = 'view_reports',                     // Can view reports
  GENERATE_REPORTS = 'generate_reports',             // Can generate/export reports

  // Staff Management (admin only)
  VIEW_STAFF = 'view_staff',                         // Can view staff list
  MANAGE_STAFF = 'manage_staff',                     // Can add/edit/delete staff

  // Class Management
  VIEW_CLASSES = 'view_classes',                     // Can view class list
  MANAGE_CLASSES = 'manage_classes',                 // Can add/edit/delete classes

  // Center Management (admin only)
  MANAGE_CENTERS = 'manage_centers',                 // Can manage center settings

  // Dashboard & Stats
  VIEW_DASHBOARD = 'view_dashboard',                 // Can view dashboard
  VIEW_ALL_STATS = 'view_all_stats',                 // Can see stats for all classes
}

// Default permissions by role
export const DEFAULT_PERMISSIONS_BY_ROLE: Record<UserRole, StaffPermission[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(StaffPermission), // All permissions
  [UserRole.CENTER_OWNER]: Object.values(StaffPermission), // All permissions
  [UserRole.DIRECTOR]: [
    StaffPermission.VIEW_ALL_CHILDREN,
    StaffPermission.CREATE_CHILDREN,
    StaffPermission.EDIT_CHILDREN,
    StaffPermission.DELETE_CHILDREN,
    StaffPermission.MANAGE_CHILDREN,
    StaffPermission.LOG_ACTIVITIES,
    StaffPermission.VIEW_ACTIVITIES,
    StaffPermission.MANAGE_ATTENDANCE,
    StaffPermission.VIEW_ATTENDANCE,
    StaffPermission.VIEW_BILLING,
    StaffPermission.MANAGE_BILLING,
    StaffPermission.RECEIVE_PAYMENTS,
    StaffPermission.SEND_MESSAGES,
    StaffPermission.VIEW_MESSAGES,
    StaffPermission.VIEW_REPORTS,
    StaffPermission.GENERATE_REPORTS,
    StaffPermission.VIEW_STAFF,
    StaffPermission.MANAGE_STAFF,
    StaffPermission.VIEW_CLASSES,
    StaffPermission.MANAGE_CLASSES,
    StaffPermission.VIEW_DASHBOARD,
    StaffPermission.VIEW_ALL_STATS,
  ],
  [UserRole.TEACHER]: [
    StaffPermission.VIEW_CLASS_CHILDREN,
    StaffPermission.EDIT_CHILDREN,                   // Teachers can edit children in their class
    StaffPermission.LOG_ACTIVITIES,
    StaffPermission.VIEW_ACTIVITIES,
    StaffPermission.MANAGE_ATTENDANCE,
    StaffPermission.VIEW_ATTENDANCE,
    StaffPermission.SEND_MESSAGES,
    StaffPermission.VIEW_MESSAGES,
    StaffPermission.VIEW_CLASSES,
    StaffPermission.VIEW_DASHBOARD,
  ],
  [UserRole.STAFF]: [
    StaffPermission.VIEW_CLASS_CHILDREN,
    StaffPermission.LOG_ACTIVITIES,
    StaffPermission.VIEW_ACTIVITIES,
    StaffPermission.MANAGE_ATTENDANCE,
    StaffPermission.VIEW_ATTENDANCE,
    StaffPermission.VIEW_DASHBOARD,
  ],
  [UserRole.PARENT]: [], // Parents don't have staff permissions
};

// Employment types
export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  TEMPORARY = 'temporary',
}

// Salary frequency
export enum SalaryFrequency {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
}

// Certification status
export enum CertificationStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  PENDING_RENEWAL = 'pending_renewal',
  SUSPENDED = 'suspended',
}

// Shift status
export enum ShiftStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

// Staff attendance status
export enum StaffAttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  HALF_DAY = 'half_day',
  ON_LEAVE = 'on_leave',
  SICK_LEAVE = 'sick_leave',
}

// Fastify Request with authenticated user context
export interface FastifyRequestWithContext extends Request {
  tenant?: RequestContext; // Note: property is named 'tenant' for backwards compatibility
}

// Legacy alias
export type FastifyRequestWithTenant = FastifyRequestWithContext;

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Report types
export enum ReportType {
  ATTENDANCE = 'attendance',
  ENROLLMENT = 'enrollment',
  FINANCIAL = 'financial',
  STAFF = 'staff',
  CUSTOM = 'custom',
}

// Report formats
export enum ReportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
  EXCEL = 'excel',
}
