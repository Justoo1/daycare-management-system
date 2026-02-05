import { FastifyRequest, FastifyReply } from 'fastify';
import { getStaffService } from '@services/StaffService';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '@utils/response';
import { TenantContext, StaffPosition, EmploymentType, UserRole, StaffPermission } from '@shared';
import { StaffService } from '@services/StaffService';

export class StaffController {
  /**
   * Create staff member with user account (unified creation)
   * POST /api/staff/create-with-user
   */
  static async createStaffWithUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const staffService = getStaffService();

      // Validate admin role
      if (tenant.role !== UserRole.CENTER_OWNER && tenant.role !== UserRole.SUPER_ADMIN) {
        return sendBadRequest(reply, 'Only center owners and super admins can create staff members');
      }

      const {
        // User fields
        firstName,
        lastName,
        email,
        phoneNumber,
        role,
        // Staff fields
        employeeId,
        position,
        department,
        hireDate,
        employmentType,
        salary,
        salaryFrequency,
        qualifications,
        specializations,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelationship,
        notes,
        centerId,
        sendInvitation = true,
      } = request.body as any;

      // Validate required fields
      if (
        !firstName ||
        !lastName ||
        !email ||
        !phoneNumber ||
        !role ||
        !employeeId ||
        !position ||
        !hireDate ||
        !employmentType ||
        !salaryFrequency
      ) {
        return sendBadRequest(
          reply,
          'Missing required fields: firstName, lastName, email, phoneNumber, role, employeeId, position, hireDate, employmentType, salaryFrequency'
        );
      }

      const result = await staffService.createStaffWithUser(
        tenant.tenantId,
        centerId || tenant.centerId,
        {
          firstName,
          lastName,
          email,
          phoneNumber,
          role,
          employeeId,
          position,
          department,
          hireDate: new Date(hireDate),
          employmentType,
          salary: salary ? parseFloat(salary) : undefined,
          salaryFrequency,
          qualifications,
          specializations,
          emergencyContactName,
          emergencyContactPhone,
          emergencyContactRelationship,
          notes,
        },
        sendInvitation
      );

      return sendCreated(
        reply,
        {
          user: result.user,
          staff: result.staff,
          message: sendInvitation
            ? `Staff created successfully. Invitation OTP sent to ${phoneNumber}`
            : 'Staff created successfully',
        },
        'Staff member created successfully'
      );
    } catch (error: any) {
      if (
        error.message.includes('already exists') ||
        error.message.includes('Invalid role')
      ) {
        return sendBadRequest(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Create a new staff profile
   * POST /api/staff
   */
  static async createStaffProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const staffService = getStaffService();

      const {
        userId,
        employeeId,
        position,
        department,
        hireDate,
        employmentType,
        salary,
        salaryFrequency,
        qualifications,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelationship,
        notes,
      } = request.body as any;

      if (!userId || !employeeId || !position || !hireDate || !employmentType || !salaryFrequency) {
        return sendBadRequest(
          reply,
          'Missing required fields: userId, employeeId, position, hireDate, employmentType, salaryFrequency'
        );
      }

      const staff = await staffService.createStaffProfile(tenant.tenantId, userId, {
        employeeId,
        position,
        department,
        hireDate: new Date(hireDate),
        employmentType,
        salary: salary ? parseFloat(salary) : undefined,
        salaryFrequency,
        qualifications,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelationship,
        notes,
      });

      return sendCreated(reply, { staff }, 'Staff profile created successfully');
    } catch (error: any) {
      if (error.message === 'Employee ID already exists') {
        return sendBadRequest(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get all staff profiles
   * GET /api/staff
   */
  static async getAllStaff(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const staffService = getStaffService();
      const query = request.query as any;

      const filters: any = {};
      if (query.position) filters.position = query.position as StaffPosition;
      if (query.employmentType) filters.employmentType = query.employmentType as EmploymentType;
      if (query.isActive !== undefined) {
        filters.isActive = query.isActive === 'true' || query.isActive === true || query.isActive === '1';
      }
      if (query.centerId) filters.centerId = query.centerId;

      const staff = await staffService.getAllStaff(tenant.tenantId, filters);

      return sendSuccess(reply, { staff, count: staff.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get staff profile by ID
   * GET /api/staff/:id
   */
  static async getStaffById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const staffService = getStaffService();
      const { id } = request.params as { id: string };

      const staff = await staffService.getStaffById(tenant.tenantId, id);

      if (!staff) {
        return sendNotFound(reply, 'Staff profile not found');
      }

      return sendSuccess(reply, { staff });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get staff profile by user ID
   * GET /api/staff/user/:userId
   */
  static async getStaffByUserId(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const staffService = getStaffService();
      const { userId } = request.params as { userId: string };

      const staff = await staffService.getStaffByUserId(tenant.tenantId, userId);

      if (!staff) {
        return sendNotFound(reply, 'Staff profile not found');
      }

      return sendSuccess(reply, { staff });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get staff by employee ID
   * GET /api/staff/employee/:employeeId
   */
  static async getStaffByEmployeeId(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const staffService = getStaffService();
      const { employeeId } = request.params as { employeeId: string };

      const staff = await staffService.getStaffByEmployeeId(tenant.tenantId, employeeId);

      if (!staff) {
        return sendNotFound(reply, 'Staff profile not found');
      }

      return sendSuccess(reply, { staff });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get staff by center
   * GET /api/staff/centers/:centerId
   */
  static async getStaffByCenter(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const staffService = getStaffService();
      const { centerId } = request.params as { centerId: string };

      const staff = await staffService.getStaffByCenter(tenant.tenantId, centerId);

      return sendSuccess(reply, { staff, count: staff.length });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Update staff profile
   * PUT /api/staff/:id
   */
  static async updateStaffProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const staffService = getStaffService();
      const { id } = request.params as { id: string };
      const updateData = request.body as any;

      const staff = await staffService.updateStaffProfile(tenant.tenantId, id, updateData);

      return sendSuccess(reply, { staff }, 'Staff profile updated successfully');
    } catch (error: any) {
      if (error.message === 'Staff profile not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Terminate staff employment
   * POST /api/staff/:id/terminate
   */
  static async terminateStaff(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const staffService = getStaffService();
      const { id } = request.params as { id: string };
      const { terminationDate, reason } = request.body as { terminationDate: string; reason?: string };

      if (!terminationDate) {
        return sendBadRequest(reply, 'terminationDate is required');
      }

      const staff = await staffService.terminateStaff(
        tenant.tenantId,
        id,
        new Date(terminationDate),
        reason
      );

      return sendSuccess(reply, { staff }, 'Staff employment terminated successfully');
    } catch (error: any) {
      if (error.message === 'Staff profile not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Reactivate staff
   * POST /api/staff/:id/reactivate
   */
  static async reactivateStaff(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const staffService = getStaffService();
      const { id } = request.params as { id: string };

      const staff = await staffService.reactivateStaff(tenant.tenantId, id);

      return sendSuccess(reply, { staff }, 'Staff reactivated successfully');
    } catch (error: any) {
      if (error.message === 'Staff profile not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Delete staff profile
   * DELETE /api/staff/:id
   */
  static async deleteStaff(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const staffService = getStaffService();
      const { id } = request.params as { id: string };

      await staffService.deleteStaff(tenant.tenantId, id);

      return sendSuccess(reply, {}, 'Staff profile deleted successfully');
    } catch (error: any) {
      if (error.message === 'Staff profile not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Assign staff to center
   * POST /api/staff/:id/assign-center
   */
  static async assignToCenter(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const staffService = getStaffService();
      const { id } = request.params as { id: string };
      const { centerId } = request.body as { centerId: string };

      if (!centerId) {
        return sendBadRequest(reply, 'centerId is required');
      }

      const staff = await staffService.assignToCenter(tenant.tenantId, id, centerId);

      return sendSuccess(reply, { staff }, 'Staff assigned to center successfully');
    } catch (error: any) {
      if (error.message === 'Staff profile not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Assign staff to class
   * POST /api/staff/:id/assign-class
   */
  static async assignToClass(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const staffService = getStaffService();
      const { id } = request.params as { id: string };
      const { classId } = request.body as { classId: string | null };

      // Validate that only managers can assign staff to classes
      const isManager = ['super_admin', 'center_owner', 'director'].includes(tenant.role);
      if (!isManager) {
        return sendBadRequest(reply, 'Only center owners, directors, and super admins can assign staff to classes');
      }

      const staff = await staffService.assignToClass(tenant.tenantId, id, classId);

      const message = classId
        ? 'Staff assigned to class successfully'
        : 'Staff removed from class successfully';

      return sendSuccess(reply, { staff }, message);
    } catch (error: any) {
      if (error.message === 'Staff profile not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Update staff salary
   * POST /api/staff/:id/update-salary
   */
  static async updateSalary(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const staffService = getStaffService();
      const { id } = request.params as { id: string };
      const { salary, salaryFrequency } = request.body as { salary: number; salaryFrequency: string };

      if (salary === undefined || !salaryFrequency) {
        return sendBadRequest(reply, 'salary and salaryFrequency are required');
      }

      const staff = await staffService.updateSalary(
        tenant.tenantId,
        id,
        parseFloat(salary.toString()),
        salaryFrequency
      );

      return sendSuccess(reply, { staff }, 'Salary updated successfully');
    } catch (error: any) {
      if (error.message === 'Staff profile not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Generate QR code for staff
   * POST /api/staff/:id/generate-qr
   */
  static async generateQRCode(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const staffService = getStaffService();
      const { id } = request.params as { id: string };

      // Validate that only managers can generate QR codes
      const isManager = ['super_admin', 'center_owner', 'director'].includes(tenant.role);
      if (!isManager) {
        return sendBadRequest(reply, 'Only center owners, directors, and super admins can generate QR codes for staff');
      }

      const staff = await staffService.generateQRCode(tenant.tenantId, id);

      return sendSuccess(reply, { staff }, 'QR code generated successfully');
    } catch (error: any) {
      if (error.message === 'Staff profile not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get staff statistics
   * GET /api/staff/statistics
   */
  static async getStaffStatistics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const staffService = getStaffService();

      const statistics = await staffService.getStaffStatistics(tenant.tenantId);

      return sendSuccess(reply, { statistics });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  // ==================== PERMISSION MANAGEMENT ====================

  /**
   * Get available permissions list with descriptions
   * GET /api/staff/permissions/available
   */
  static async getAvailablePermissions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const permissions = StaffService.getAvailablePermissions();

      // Group by category
      const grouped = permissions.reduce((acc, perm) => {
        if (!acc[perm.category]) {
          acc[perm.category] = [];
        }
        acc[perm.category].push({
          permission: perm.permission,
          description: perm.description,
        });
        return acc;
      }, {} as Record<string, Array<{ permission: StaffPermission; description: string }>>);

      return sendSuccess(reply, { permissions: grouped });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get default permissions for a role
   * GET /api/staff/permissions/defaults/:role
   */
  static async getDefaultPermissionsForRole(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { role } = request.params as { role: UserRole };

      // Validate role
      const validRoles = Object.values(UserRole);
      if (!validRoles.includes(role)) {
        return sendBadRequest(reply, `Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }

      const permissions = StaffService.getDefaultPermissionsForRole(role);

      return sendSuccess(reply, { role, permissions });
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get staff member's permissions
   * GET /api/staff/:id/permissions
   */
  static async getStaffPermissions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const staffService = getStaffService();
      const { id } = request.params as { id: string };

      // Validate that only managers can view staff permissions
      const isManager = ['super_admin', 'center_owner', 'director'].includes(tenant.role);
      if (!isManager) {
        return sendBadRequest(reply, 'Only center owners, directors, and super admins can view staff permissions');
      }

      const permissions = await staffService.getStaffPermissions(tenant.tenantId, id);

      return sendSuccess(reply, permissions);
    } catch (error: any) {
      if (error.message === 'Staff profile not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Update staff member's permissions
   * PUT /api/staff/:id/permissions
   */
  static async updateStaffPermissions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const staffService = getStaffService();
      const { id } = request.params as { id: string };
      const { permissions, useCustomPermissions = true } = request.body as {
        permissions: StaffPermission[];
        useCustomPermissions?: boolean;
      };

      // Validate that only managers can update staff permissions
      const isManager = ['super_admin', 'center_owner', 'director'].includes(tenant.role);
      if (!isManager) {
        return sendBadRequest(reply, 'Only center owners, directors, and super admins can update staff permissions');
      }

      if (!permissions || !Array.isArray(permissions)) {
        return sendBadRequest(reply, 'permissions must be an array');
      }

      const staff = await staffService.updateStaffPermissions(
        tenant.tenantId,
        id,
        permissions,
        useCustomPermissions
      );

      return sendSuccess(reply, { staff }, 'Staff permissions updated successfully');
    } catch (error: any) {
      if (error.message === 'Staff profile not found') {
        return sendNotFound(reply, error.message);
      }
      if (error.message.includes('Invalid permissions')) {
        return sendBadRequest(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Reset staff member's permissions to default role permissions
   * POST /api/staff/:id/permissions/reset
   */
  static async resetStaffPermissions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const staffService = getStaffService();
      const { id } = request.params as { id: string };

      // Validate that only managers can reset staff permissions
      const isManager = ['super_admin', 'center_owner', 'director'].includes(tenant.role);
      if (!isManager) {
        return sendBadRequest(reply, 'Only center owners, directors, and super admins can reset staff permissions');
      }

      const staff = await staffService.resetStaffPermissions(tenant.tenantId, id);

      return sendSuccess(reply, { staff }, 'Staff permissions reset to default successfully');
    } catch (error: any) {
      if (error.message === 'Staff profile not found') {
        return sendNotFound(reply, error.message);
      }
      return sendServerError(reply, error.message);
    }
  }
}
