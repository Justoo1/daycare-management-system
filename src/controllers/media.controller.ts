import { FastifyRequest, FastifyReply } from 'fastify';
import { imageKitService, UploadResponse } from '../services/ImageKitService';

/**
 * Media Controller
 * Handles file uploads, authentication, and media management via ImageKit
 */
export class MediaController {
  /**
   * Get ImageKit authentication parameters for client-side uploads
   * GET /api/media/auth
   */
  async getAuthParams(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!imageKitService.isConfigured()) {
        return reply.status(503).send({
          success: false,
          message: 'Media service not configured',
        });
      }

      const authParams = imageKitService.getAuthenticationParameters();

      return reply.send({
        success: true,
        data: authParams,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Failed to get authentication parameters',
      });
    }
  }

  /**
   * Upload file via server (for sensitive uploads)
   * POST /api/media/upload
   */
  async uploadFile(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!imageKitService.isConfigured()) {
        return reply.status(503).send({
          success: false,
          message: 'Media service not configured',
        });
      }

      const { tenantId } = request.user as any;
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          success: false,
          message: 'No file provided',
        });
      }

      // Get file buffer
      const buffer = await data.toBuffer();
      const fileName = data.filename;

      // Get folder from query or default to 'uploads'
      const folder = (request.query as any).folder || '/uploads';
      const tags = (request.query as any).tags?.split(',') || [];

      // Validate file size (max 10MB for images, 50MB for videos)
      const maxSize = data.mimetype.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (buffer.length > maxSize) {
        return reply.status(400).send({
          success: false,
          message: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`,
        });
      }

      // Validate file type
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/quicktime',
        'video/webm',
        'application/pdf',
      ];

      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({
          success: false,
          message: 'File type not allowed',
        });
      }

      const result = await imageKitService.uploadFile(
        buffer,
        fileName,
        folder,
        tenantId,
        { tags }
      );

      return reply.status(201).send({
        success: true,
        message: 'File uploaded successfully',
        data: result,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Failed to upload file',
      });
    }
  }

  /**
   * Upload multiple files
   * POST /api/media/upload-multiple
   */
  async uploadMultipleFiles(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!imageKitService.isConfigured()) {
        return reply.status(503).send({
          success: false,
          message: 'Media service not configured',
        });
      }

      const { tenantId } = request.user as any;
      const parts = request.files();

      const folder = (request.query as any).folder || '/uploads';
      const files: Array<{ buffer: Buffer; fileName: string }> = [];

      for await (const part of parts) {
        const buffer = await part.toBuffer();
        files.push({
          buffer,
          fileName: part.filename,
        });
      }

      if (files.length === 0) {
        return reply.status(400).send({
          success: false,
          message: 'No files provided',
        });
      }

      const results = await imageKitService.uploadMultipleFiles(files, folder, tenantId);

      return reply.status(201).send({
        success: true,
        message: `${results.length} files uploaded successfully`,
        data: results,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Failed to upload files',
      });
    }
  }

  /**
   * Delete file
   * DELETE /api/media/:fileId
   */
  async deleteFile(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!imageKitService.isConfigured()) {
        return reply.status(503).send({
          success: false,
          message: 'Media service not configured',
        });
      }

      const { fileId } = request.params as { fileId: string };

      if (!fileId) {
        return reply.status(400).send({
          success: false,
          message: 'File ID is required',
        });
      }

      await imageKitService.deleteFile(fileId);

      return reply.send({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Failed to delete file',
      });
    }
  }

  /**
   * Delete multiple files
   * POST /api/media/delete-multiple
   */
  async deleteMultipleFiles(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!imageKitService.isConfigured()) {
        return reply.status(503).send({
          success: false,
          message: 'Media service not configured',
        });
      }

      const { fileIds } = request.body as { fileIds: string[] };

      if (!fileIds || fileIds.length === 0) {
        return reply.status(400).send({
          success: false,
          message: 'File IDs are required',
        });
      }

      await imageKitService.deleteMultipleFiles(fileIds);

      return reply.send({
        success: true,
        message: `${fileIds.length} files deleted successfully`,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Failed to delete files',
      });
    }
  }

  /**
   * Get file details
   * GET /api/media/:fileId
   */
  async getFileDetails(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!imageKitService.isConfigured()) {
        return reply.status(503).send({
          success: false,
          message: 'Media service not configured',
        });
      }

      const { fileId } = request.params as { fileId: string };

      if (!fileId) {
        return reply.status(400).send({
          success: false,
          message: 'File ID is required',
        });
      }

      const fileDetails = await imageKitService.getFileDetails(fileId);

      return reply.send({
        success: true,
        data: fileDetails,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Failed to get file details',
      });
    }
  }

  /**
   * List files in a folder
   * GET /api/media/list
   */
  async listFiles(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!imageKitService.isConfigured()) {
        return reply.status(503).send({
          success: false,
          message: 'Media service not configured',
        });
      }

      const { tenantId } = request.user as any;
      const query = request.query as {
        folder?: string;
        skip?: string;
        limit?: string;
        search?: string;
        fileType?: 'image' | 'non-image' | 'all';
        tags?: string;
      };

      // Ensure files are scoped to tenant
      const path = query.folder ? `/${tenantId}${query.folder}` : `/${tenantId}`;

      const files = await imageKitService.listFiles({
        path,
        skip: query.skip ? parseInt(query.skip) : 0,
        limit: query.limit ? parseInt(query.limit) : 50,
        searchQuery: query.search,
        fileType: query.fileType || 'all',
        tags: query.tags?.split(','),
      });

      return reply.send({
        success: true,
        data: files,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Failed to list files',
      });
    }
  }

  /**
   * Get optimized URL for a file
   * POST /api/media/url
   */
  async getOptimizedUrl(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { filePath, transformations } = request.body as {
        filePath: string;
        transformations?: any[];
      };

      if (!filePath) {
        return reply.status(400).send({
          success: false,
          message: 'File path is required',
        });
      }

      const url = imageKitService.getOptimizedUrl(filePath, transformations);

      return reply.send({
        success: true,
        data: { url },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Failed to generate URL',
      });
    }
  }

  /**
   * Initialize folder structure for a tenant
   * POST /api/media/initialize-folders
   */
  async initializeFolders(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!imageKitService.isConfigured()) {
        return reply.status(503).send({
          success: false,
          message: 'Media service not configured',
        });
      }

      const { tenantId } = request.user as any;

      await imageKitService.initializeTenantFolders(tenantId);

      return reply.send({
        success: true,
        message: 'Folder structure initialized successfully',
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Failed to initialize folders',
      });
    }
  }

  /**
   * Get ImageKit configuration for frontend
   * GET /api/media/config
   */
  async getConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { tenantId } = request.user as any;

      return reply.send({
        success: true,
        data: {
          urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
          publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
          isConfigured: imageKitService.isConfigured(),
          tenantFolder: `/${tenantId}`,
        },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Failed to get configuration',
      });
    }
  }

  /**
   * Upload child profile photo
   * POST /api/media/child/:childId/photo
   */
  async uploadChildPhoto(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!imageKitService.isConfigured()) {
        return reply.status(503).send({
          success: false,
          message: 'Media service not configured',
        });
      }

      const { tenantId } = request.user as any;
      const { childId } = request.params as { childId: string };
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          success: false,
          message: 'No file provided',
        });
      }

      const buffer = await data.toBuffer();

      const result = await imageKitService.uploadFile(
        buffer,
        data.filename,
        '/children',
        tenantId,
        {
          tags: ['child', 'profile', childId],
          customMetadata: {
            entityType: 'child',
            entityId: childId,
            tenantId: tenantId,
          },
        }
      );

      return reply.status(201).send({
        success: true,
        message: 'Child photo uploaded successfully',
        data: result,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Failed to upload child photo',
      });
    }
  }

  /**
   * Upload staff profile photo
   * POST /api/media/staff/:staffId/photo
   */
  async uploadStaffPhoto(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!imageKitService.isConfigured()) {
        return reply.status(503).send({
          success: false,
          message: 'Media service not configured',
        });
      }

      const { tenantId } = request.user as any;
      const { staffId } = request.params as { staffId: string };
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          success: false,
          message: 'No file provided',
        });
      }

      const buffer = await data.toBuffer();

      const result = await imageKitService.uploadFile(
        buffer,
        data.filename,
        '/staff',
        tenantId,
        {
          tags: ['staff', 'profile', staffId],
          customMetadata: {
            entityType: 'staff',
            entityId: staffId,
            tenantId: tenantId,
          },
        }
      );

      return reply.status(201).send({
        success: true,
        message: 'Staff photo uploaded successfully',
        data: result,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Failed to upload staff photo',
      });
    }
  }

  /**
   * Upload activity media (photo/video)
   * POST /api/media/activity/:activityId
   */
  async uploadActivityMedia(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!imageKitService.isConfigured()) {
        return reply.status(503).send({
          success: false,
          message: 'Media service not configured',
        });
      }

      const { tenantId } = request.user as any;
      const { activityId } = request.params as { activityId: string };
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          success: false,
          message: 'No file provided',
        });
      }

      const buffer = await data.toBuffer();
      const isVideo = data.mimetype.startsWith('video/');

      const result = await imageKitService.uploadFile(
        buffer,
        data.filename,
        '/activities',
        tenantId,
        {
          tags: ['activity', isVideo ? 'video' : 'photo', activityId],
          customMetadata: {
            entityType: 'activity',
            entityId: activityId,
            tenantId: tenantId,
            mediaType: isVideo ? 'video' : 'photo',
          },
        }
      );

      return reply.status(201).send({
        success: true,
        message: 'Activity media uploaded successfully',
        data: result,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Failed to upload activity media',
      });
    }
  }
}

export const mediaController = new MediaController();
