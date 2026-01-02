import { FastifyRequest, FastifyReply } from 'fastify';
import { getFileUploadService } from '@services/FileUploadService';
import { sendSuccess, sendBadRequest, sendServerError } from '@utils/response';
import { TenantContext } from '@shared';
import { MultipartFile } from '@fastify/multipart';

export class FileUploadController {
  /**
   * Upload a single photo
   * POST /api/uploads/photo
   */
  static async uploadPhoto(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const fileUploadService = getFileUploadService();

      if (!fileUploadService.isConfigured()) {
        return sendServerError(reply, 'File upload service not configured. Please set AWS S3 credentials.');
      }

      const data = await request.file();

      if (!data) {
        return sendBadRequest(reply, 'No file provided');
      }

      // Validate file type (images only)
      const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      if (!fileUploadService.validateFileType(data.filename, allowedTypes)) {
        return sendBadRequest(reply, 'Invalid file type. Only images are allowed.');
      }

      // Validate file size (10MB max)
      const buffer = await data.toBuffer();
      if (!fileUploadService.validateFileSize(buffer.length, 10)) {
        return sendBadRequest(reply, 'File size exceeds 10MB limit');
      }

      // Upload to S3
      const fileUrl = await fileUploadService.uploadFile(
        buffer,
        data.filename,
        'photos',
        tenant.tenantId
      );

      return sendSuccess(reply, { fileUrl }, 'Photo uploaded successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Upload multiple photos
   * POST /api/uploads/photos
   */
  static async uploadPhotos(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const fileUploadService = getFileUploadService();

      if (!fileUploadService.isConfigured()) {
        return sendServerError(reply, 'File upload service not configured');
      }

      const parts = request.parts();
      const files: Array<{ buffer: Buffer; fileName: string }> = [];
      const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

      for await (const part of parts) {
        if (part.type === 'file') {
          const file = part as MultipartFile;

          // Validate file type
          if (!fileUploadService.validateFileType(file.filename, allowedTypes)) {
            return sendBadRequest(reply, `Invalid file type: ${file.filename}`);
          }

          const buffer = await file.toBuffer();

          // Validate file size
          if (!fileUploadService.validateFileSize(buffer.length, 10)) {
            return sendBadRequest(reply, `File size exceeds limit: ${file.filename}`);
          }

          files.push({ buffer, fileName: file.filename });
        }
      }

      if (files.length === 0) {
        return sendBadRequest(reply, 'No files provided');
      }

      // Upload all files
      const fileUrls = await fileUploadService.uploadMultipleFiles(
        files,
        'photos',
        tenant.tenantId
      );

      return sendSuccess(reply, { fileUrls, count: fileUrls.length }, 'Photos uploaded successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Upload a document (PDF, DOC, etc.)
   * POST /api/uploads/document
   */
  static async uploadDocument(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const fileUploadService = getFileUploadService();

      if (!fileUploadService.isConfigured()) {
        return sendServerError(reply, 'File upload service not configured');
      }

      const data = await request.file();

      if (!data) {
        return sendBadRequest(reply, 'No file provided');
      }

      // Validate file type (documents only)
      const allowedTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
      if (!fileUploadService.validateFileType(data.filename, allowedTypes)) {
        return sendBadRequest(reply, 'Invalid file type. Only documents are allowed.');
      }

      // Validate file size (20MB max for documents)
      const buffer = await data.toBuffer();
      if (!fileUploadService.validateFileSize(buffer.length, 20)) {
        return sendBadRequest(reply, 'File size exceeds 20MB limit');
      }

      // Upload to S3
      const fileUrl = await fileUploadService.uploadFile(
        buffer,
        data.filename,
        'documents',
        tenant.tenantId
      );

      return sendSuccess(reply, { fileUrl }, 'Document uploaded successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Upload a video
   * POST /api/uploads/video
   */
  static async uploadVideo(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const fileUploadService = getFileUploadService();

      if (!fileUploadService.isConfigured()) {
        return sendServerError(reply, 'File upload service not configured');
      }

      const data = await request.file();

      if (!data) {
        return sendBadRequest(reply, 'No file provided');
      }

      // Validate file type (videos only)
      const allowedTypes = ['.mp4', '.mov', '.avi', '.webm'];
      if (!fileUploadService.validateFileType(data.filename, allowedTypes)) {
        return sendBadRequest(reply, 'Invalid file type. Only videos are allowed.');
      }

      // Validate file size (100MB max for videos)
      const buffer = await data.toBuffer();
      if (!fileUploadService.validateFileSize(buffer.length, 100)) {
        return sendBadRequest(reply, 'File size exceeds 100MB limit');
      }

      // Upload to S3
      const fileUrl = await fileUploadService.uploadFile(
        buffer,
        data.filename,
        'videos',
        tenant.tenantId
      );

      return sendSuccess(reply, { fileUrl }, 'Video uploaded successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Upload a voice note
   * POST /api/uploads/voice-note
   */
  static async uploadVoiceNote(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenant = (request as any).tenant as TenantContext;
      const fileUploadService = getFileUploadService();

      if (!fileUploadService.isConfigured()) {
        return sendServerError(reply, 'File upload service not configured');
      }

      const data = await request.file();

      if (!data) {
        return sendBadRequest(reply, 'No file provided');
      }

      // Validate file type (audio only)
      const allowedTypes = ['.mp3', '.wav', '.m4a'];
      if (!fileUploadService.validateFileType(data.filename, allowedTypes)) {
        return sendBadRequest(reply, 'Invalid file type. Only audio files are allowed.');
      }

      // Validate file size (10MB max)
      const buffer = await data.toBuffer();
      if (!fileUploadService.validateFileSize(buffer.length, 10)) {
        return sendBadRequest(reply, 'File size exceeds 10MB limit');
      }

      // Upload to S3
      const fileUrl = await fileUploadService.uploadFile(
        buffer,
        data.filename,
        'voice-notes',
        tenant.tenantId
      );

      return sendSuccess(reply, { fileUrl }, 'Voice note uploaded successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Delete a file
   * DELETE /api/uploads/file
   */
  static async deleteFile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const fileUploadService = getFileUploadService();
      const { fileUrl } = request.body as { fileUrl: string };

      if (!fileUrl) {
        return sendBadRequest(reply, 'File URL is required');
      }

      if (!fileUploadService.isConfigured()) {
        return sendServerError(reply, 'File upload service not configured');
      }

      await fileUploadService.deleteFile(fileUrl);

      return sendSuccess(reply, {}, 'File deleted successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get presigned URL for temporary file access
   * POST /api/uploads/presigned-url
   */
  static async getPresignedUrl(request: FastifyRequest, reply: FastifyReply) {
    try {
      const fileUploadService = getFileUploadService();
      const { fileUrl, expiresIn } = request.body as { fileUrl: string; expiresIn?: number };

      if (!fileUrl) {
        return sendBadRequest(reply, 'File URL is required');
      }

      if (!fileUploadService.isConfigured()) {
        return sendServerError(reply, 'File upload service not configured');
      }

      const presignedUrl = await fileUploadService.getPresignedUrl(fileUrl, expiresIn);

      return sendSuccess(reply, { presignedUrl, expiresIn: expiresIn || 3600 }, 'Presigned URL generated');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }
}
