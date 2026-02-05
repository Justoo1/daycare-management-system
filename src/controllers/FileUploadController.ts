import { FastifyRequest, FastifyReply } from 'fastify';
import { getImageKitService } from '@services/ImageKitService';
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
      const imageKitService = getImageKitService();

      if (!imageKitService.isConfigured()) {
        return sendServerError(reply, 'File upload service not configured. Please set ImageKit credentials.');
      }

      const data = await request.file();

      if (!data) {
        return sendBadRequest(reply, 'No file provided');
      }

      // Validate file type (images only)
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const fileExt = '.' + (data.filename.split('.').pop()?.toLowerCase() || '');
      if (!allowedExtensions.includes(fileExt)) {
        return sendBadRequest(reply, 'Invalid file type. Only images are allowed.');
      }

      // Validate file size (10MB max)
      const buffer = await data.toBuffer();
      const maxSizeMB = 10;
      if (buffer.length > maxSizeMB * 1024 * 1024) {
        return sendBadRequest(reply, 'File size exceeds 10MB limit');
      }

      // Upload to ImageKit
      const result = await imageKitService.uploadFile(
        buffer,
        data.filename,
        '/photos',
        tenant.tenantId
      );

      return sendSuccess(reply, { fileUrl: result.url, fileId: result.fileId }, 'Photo uploaded successfully');
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
      const imageKitService = getImageKitService();

      if (!imageKitService.isConfigured()) {
        return sendServerError(reply, 'File upload service not configured. Please set ImageKit credentials.');
      }

      const parts = request.parts();
      const files: Array<{ buffer: Buffer; fileName: string }> = [];
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const maxSizeMB = 10;

      for await (const part of parts) {
        if (part.type === 'file') {
          const file = part as MultipartFile;

          // Validate file type
          const fileExt = '.' + (file.filename.split('.').pop()?.toLowerCase() || '');
          if (!allowedExtensions.includes(fileExt)) {
            return sendBadRequest(reply, `Invalid file type: ${file.filename}`);
          }

          const buffer = await file.toBuffer();

          // Validate file size
          if (buffer.length > maxSizeMB * 1024 * 1024) {
            return sendBadRequest(reply, `File size exceeds limit: ${file.filename}`);
          }

          files.push({ buffer, fileName: file.filename });
        }
      }

      if (files.length === 0) {
        return sendBadRequest(reply, 'No files provided');
      }

      // Upload all files to ImageKit
      const results = await imageKitService.uploadMultipleFiles(
        files,
        '/photos',
        tenant.tenantId
      );

      const fileUrls = results.map(r => r.url);

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
      const imageKitService = getImageKitService();

      if (!imageKitService.isConfigured()) {
        return sendServerError(reply, 'File upload service not configured. Please set ImageKit credentials.');
      }

      const data = await request.file();

      if (!data) {
        return sendBadRequest(reply, 'No file provided');
      }

      // Validate file type (documents only)
      const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
      const fileExt = '.' + (data.filename.split('.').pop()?.toLowerCase() || '');
      if (!allowedExtensions.includes(fileExt)) {
        return sendBadRequest(reply, 'Invalid file type. Only documents are allowed.');
      }

      // Validate file size (20MB max for documents)
      const buffer = await data.toBuffer();
      const maxSizeMB = 20;
      if (buffer.length > maxSizeMB * 1024 * 1024) {
        return sendBadRequest(reply, 'File size exceeds 20MB limit');
      }

      // Upload to ImageKit
      const result = await imageKitService.uploadFile(
        buffer,
        data.filename,
        '/documents',
        tenant.tenantId
      );

      return sendSuccess(reply, { fileUrl: result.url, fileId: result.fileId }, 'Document uploaded successfully');
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
      const imageKitService = getImageKitService();

      if (!imageKitService.isConfigured()) {
        return sendServerError(reply, 'File upload service not configured. Please set ImageKit credentials.');
      }

      const data = await request.file();

      if (!data) {
        return sendBadRequest(reply, 'No file provided');
      }

      // Validate file type (videos only)
      const allowedExtensions = ['.mp4', '.mov', '.avi', '.webm'];
      const fileExt = '.' + (data.filename.split('.').pop()?.toLowerCase() || '');
      if (!allowedExtensions.includes(fileExt)) {
        return sendBadRequest(reply, 'Invalid file type. Only videos are allowed.');
      }

      // Validate file size (100MB max for videos)
      const buffer = await data.toBuffer();
      const maxSizeMB = 100;
      if (buffer.length > maxSizeMB * 1024 * 1024) {
        return sendBadRequest(reply, 'File size exceeds 100MB limit');
      }

      // Upload to ImageKit
      const result = await imageKitService.uploadFile(
        buffer,
        data.filename,
        '/videos',
        tenant.tenantId
      );

      return sendSuccess(reply, { fileUrl: result.url, fileId: result.fileId }, 'Video uploaded successfully');
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
      const imageKitService = getImageKitService();

      if (!imageKitService.isConfigured()) {
        return sendServerError(reply, 'File upload service not configured. Please set ImageKit credentials.');
      }

      const data = await request.file();

      if (!data) {
        return sendBadRequest(reply, 'No file provided');
      }

      // Validate file type (audio only)
      const allowedExtensions = ['.mp3', '.wav', '.m4a'];
      const fileExt = '.' + (data.filename.split('.').pop()?.toLowerCase() || '');
      if (!allowedExtensions.includes(fileExt)) {
        return sendBadRequest(reply, 'Invalid file type. Only audio files are allowed.');
      }

      // Validate file size (10MB max)
      const buffer = await data.toBuffer();
      const maxSizeMB = 10;
      if (buffer.length > maxSizeMB * 1024 * 1024) {
        return sendBadRequest(reply, 'File size exceeds 10MB limit');
      }

      // Upload to ImageKit
      const result = await imageKitService.uploadFile(
        buffer,
        data.filename,
        '/voice-notes',
        tenant.tenantId
      );

      return sendSuccess(reply, { fileUrl: result.url, fileId: result.fileId }, 'Voice note uploaded successfully');
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
      const imageKitService = getImageKitService();
      const { fileId, fileUrl } = request.body as { fileId?: string; fileUrl?: string };

      if (!fileId && !fileUrl) {
        return sendBadRequest(reply, 'File ID or URL is required');
      }

      if (!imageKitService.isConfigured()) {
        return sendServerError(reply, 'File upload service not configured. Please set ImageKit credentials.');
      }

      // If only fileUrl provided, we need the fileId for ImageKit deletion
      // For now, require fileId for deletion
      if (!fileId) {
        return sendBadRequest(reply, 'File ID is required for deletion. Please provide the fileId.');
      }

      await imageKitService.deleteFile(fileId);

      return sendSuccess(reply, {}, 'File deleted successfully');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get authentication parameters for client-side uploads
   * POST /api/uploads/auth
   */
  static async getAuthParameters(request: FastifyRequest, reply: FastifyReply) {
    try {
      const imageKitService = getImageKitService();

      if (!imageKitService.isConfigured()) {
        return sendServerError(reply, 'File upload service not configured. Please set ImageKit credentials.');
      }

      const authParams = imageKitService.getAuthenticationParameters();

      return sendSuccess(reply, authParams, 'Authentication parameters generated');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }

  /**
   * Get presigned URL for temporary file access (ImageKit URLs are public by default)
   * POST /api/uploads/presigned-url
   */
  static async getPresignedUrl(request: FastifyRequest, reply: FastifyReply) {
    try {
      const imageKitService = getImageKitService();
      const { fileUrl } = request.body as { fileUrl: string; expiresIn?: number };

      if (!fileUrl) {
        return sendBadRequest(reply, 'File URL is required');
      }

      if (!imageKitService.isConfigured()) {
        return sendServerError(reply, 'File upload service not configured. Please set ImageKit credentials.');
      }

      // ImageKit URLs are publicly accessible by default
      // Just return the same URL (could add transformations if needed)
      return sendSuccess(reply, { presignedUrl: fileUrl }, 'URL generated');
    } catch (error: any) {
      return sendServerError(reply, error.message);
    }
  }
}
