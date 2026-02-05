import ImageKit from 'imagekit';
import { config } from '@config/environment';
import { randomUUID } from 'crypto';
import * as path from 'path';

/**
 * ImageKit Service for media upload, transformation, and CDN delivery
 */
export class ImageKitService {
  private imagekit: ImageKit | null = null;
  private urlEndpoint: string;

  constructor() {
    this.urlEndpoint = config.imagekit.urlEndpoint;

    // Initialize ImageKit client only if credentials are provided
    if (config.imagekit.publicKey && config.imagekit.privateKey && config.imagekit.urlEndpoint) {
      this.imagekit = new ImageKit({
        publicKey: config.imagekit.publicKey,
        privateKey: config.imagekit.privateKey,
        urlEndpoint: config.imagekit.urlEndpoint,
      });
      console.log('✅ ImageKit service initialized');
    } else {
      console.warn('⚠️  ImageKit credentials not configured. Media service will not work.');
    }
  }

  /**
   * Check if ImageKit is configured
   */
  isConfigured(): boolean {
    return this.imagekit !== null;
  }

  /**
   * Get authentication parameters for client-side uploads
   * These parameters should be sent to the frontend for secure uploads
   */
  getAuthenticationParameters(): { token: string; expire: number; signature: string } {
    if (!this.imagekit) {
      throw new Error('ImageKit not configured');
    }

    return this.imagekit.getAuthenticationParameters();
  }

  /**
   * Upload file to ImageKit
   * @param file - File buffer or base64 string
   * @param fileName - Original file name
   * @param folder - Folder path (e.g., '/children', '/documents', '/activities')
   * @param tenantId - Tenant ID for organization
   * @param options - Additional upload options
   */
  async uploadFile(
    file: Buffer | string,
    fileName: string,
    folder: string,
    tenantId: string,
    options?: {
      tags?: string[];
      customMetadata?: Record<string, string | number | boolean>;
      useUniqueFileName?: boolean;
    }
  ): Promise<UploadResponse> {
    if (!this.imagekit) {
      throw new Error('ImageKit not configured. Please set IMAGEKIT_* environment variables.');
    }

    // Generate unique file name
    const fileExt = path.extname(fileName);
    const fileNameWithoutExt = path.basename(fileName, fileExt);
    const uniqueFileName = options?.useUniqueFileName !== false
      ? `${fileNameWithoutExt}-${randomUUID().slice(0, 8)}${fileExt}`
      : fileName;

    // Use NKABOM_DAYCARE as root folder, organized by tenant
    const rootFolder = 'NKABOM_DAYCARE';
    const fullFolder = `/${rootFolder}/${tenantId}${folder}`;

    try {
      // Build upload options - only include defined values
      const uploadOptions: any = {
        file: file instanceof Buffer ? file.toString('base64') : file,
        fileName: uniqueFileName,
        folder: fullFolder,
      };

      // Only add tags if provided
      if (options?.tags && options.tags.length > 0) {
        uploadOptions.tags = options.tags;
      }

      // Add customMetadata if provided
      // NOTE: These fields must be pre-configured in ImageKit dashboard:
      // Settings > Media Library > Custom Metadata Fields
      // Required fields: tenantId (Text), entityType (Text), entityId (Text)
      if (options?.customMetadata && Object.keys(options.customMetadata).length > 0) {
        uploadOptions.customMetadata = options.customMetadata;
      }

      const response = await this.imagekit.upload(uploadOptions);

      console.log(`✅ File uploaded to ImageKit: ${response.url}`);

      return {
        fileId: response.fileId,
        name: response.name,
        url: response.url,
        thumbnailUrl: response.thumbnailUrl,
        filePath: response.filePath,
        fileType: response.fileType,
        size: response.size,
        width: response.width,
        height: response.height,
      };
    } catch (error: any) {
      console.error('❌ Failed to upload file to ImageKit:', error.message);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: Array<{ buffer: Buffer; fileName: string; tags?: string[] }>,
    folder: string,
    tenantId: string
  ): Promise<UploadResponse[]> {
    const uploadPromises = files.map((file) =>
      this.uploadFile(file.buffer, file.fileName, folder, tenantId, { tags: file.tags })
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Delete file from ImageKit
   * @param fileId - ImageKit file ID
   */
  async deleteFile(fileId: string): Promise<void> {
    if (!this.imagekit) {
      throw new Error('ImageKit not configured');
    }

    try {
      await this.imagekit.deleteFile(fileId);
      console.log(`✅ File deleted from ImageKit: ${fileId}`);
    } catch (error: any) {
      console.error('❌ Failed to delete file from ImageKit:', error.message);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * Delete multiple files
   */
  async deleteMultipleFiles(fileIds: string[]): Promise<void> {
    if (!this.imagekit) {
      throw new Error('ImageKit not configured');
    }

    try {
      await this.imagekit.bulkDeleteFiles(fileIds);
      console.log(`✅ ${fileIds.length} files deleted from ImageKit`);
    } catch (error: any) {
      console.error('❌ Failed to delete files from ImageKit:', error.message);
      throw new Error(`Bulk file deletion failed: ${error.message}`);
    }
  }

  /**
   * Get file details
   */
  async getFileDetails(fileId: string): Promise<any> {
    if (!this.imagekit) {
      throw new Error('ImageKit not configured');
    }

    try {
      return await this.imagekit.getFileDetails(fileId);
    } catch (error: any) {
      console.error('❌ Failed to get file details:', error.message);
      throw new Error(`Get file details failed: ${error.message}`);
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(options: {
    path?: string;
    skip?: number;
    limit?: number;
    searchQuery?: string;
    fileType?: 'image' | 'non-image' | 'all';
    tags?: string[];
  }): Promise<any[]> {
    if (!this.imagekit) {
      throw new Error('ImageKit not configured');
    }

    try {
      const response = await this.imagekit.listFiles({
        path: options.path,
        skip: options.skip || 0,
        limit: options.limit || 100,
        searchQuery: options.searchQuery,
        fileType: options.fileType || 'all',
        tags: options.tags?.join(','),
      });

      return response;
    } catch (error: any) {
      console.error('❌ Failed to list files:', error.message);
      throw new Error(`List files failed: ${error.message}`);
    }
  }

  /**
   * Generate optimized URL with transformations
   * @param filePath - Path to the file in ImageKit
   * @param transformations - Array of transformation options
   */
  getOptimizedUrl(
    filePath: string,
    transformations?: Transformation[]
  ): string {
    if (!this.imagekit) {
      // Return direct URL if not configured
      return `${this.urlEndpoint}${filePath}`;
    }

    return this.imagekit.url({
      path: filePath,
      transformation: transformations,
    });
  }

  /**
   * Get thumbnail URL for images/videos
   */
  getThumbnailUrl(filePath: string, width: number = 150, height: number = 150): string {
    return this.getOptimizedUrl(filePath, [
      { width: width.toString(), height: height.toString(), crop: 'at_max' },
    ]);
  }

  /**
   * Get responsive image URL
   */
  getResponsiveImageUrl(filePath: string, maxWidth: number = 800): string {
    return this.getOptimizedUrl(filePath, [
      { width: maxWidth.toString(), quality: '80', format: 'auto' },
    ]);
  }

  /**
   * Get video thumbnail URL
   */
  getVideoThumbnailUrl(filePath: string, width: number = 400, height: number = 300): string {
    return this.getOptimizedUrl(filePath, [
      { width: width.toString(), height: height.toString() },
    ]);
  }

  /**
   * Get blurred placeholder URL (for lazy loading)
   */
  getBlurredPlaceholderUrl(filePath: string): string {
    return this.getOptimizedUrl(filePath, [
      { width: '50', quality: '20', blur: '30' },
    ]);
  }

  /**
   * Create folder in ImageKit
   */
  async createFolder(folderName: string, parentFolderPath: string = '/'): Promise<void> {
    if (!this.imagekit) {
      throw new Error('ImageKit not configured');
    }

    try {
      await this.imagekit.createFolder({
        folderName,
        parentFolderPath,
      });
      console.log(`✅ Folder created: ${parentFolderPath}${folderName}`);
    } catch (error: any) {
      // Folder might already exist, which is fine
      if (!error.message?.includes('already exists')) {
        console.error('❌ Failed to create folder:', error.message);
        throw new Error(`Create folder failed: ${error.message}`);
      }
    }
  }

  /**
   * Initialize tenant folder structure
   */
  async initializeTenantFolders(tenantId: string): Promise<void> {
    const rootFolder = 'NKABOM_DAYCARE';
    const folders = [
      'children',      // Child profile photos
      'staff',         // Staff profile photos
      'documents',     // Documents (PDFs, etc.)
      'activities',    // Activity photos and videos
      'centers',       // Center/facility images
      'incidents',     // Incident report attachments
      'reports',       // Generated reports
    ];

    // First create the tenant folder under root
    await this.createFolder(tenantId, `/${rootFolder}/`);

    // Then create subfolders
    for (const folder of folders) {
      await this.createFolder(folder, `/${rootFolder}/${tenantId}/`);
    }

    console.log(`✅ Initialized folder structure for tenant: ${tenantId}`);
  }

  /**
   * Copy file to a new location
   */
  async copyFile(
    sourceFilePath: string,
    destinationPath: string,
    includeFileVersions: boolean = false
  ): Promise<void> {
    if (!this.imagekit) {
      throw new Error('ImageKit not configured');
    }

    try {
      await this.imagekit.copyFile({
        sourceFilePath,
        destinationPath,
        includeFileVersions,
      });
      console.log(`✅ File copied: ${sourceFilePath} -> ${destinationPath}`);
    } catch (error: any) {
      console.error('❌ Failed to copy file:', error.message);
      throw new Error(`Copy file failed: ${error.message}`);
    }
  }

  /**
   * Move file to a new location
   */
  async moveFile(sourceFilePath: string, destinationPath: string): Promise<void> {
    if (!this.imagekit) {
      throw new Error('ImageKit not configured');
    }

    try {
      await this.imagekit.moveFile({
        sourceFilePath,
        destinationPath,
      });
      console.log(`✅ File moved: ${sourceFilePath} -> ${destinationPath}`);
    } catch (error: any) {
      console.error('❌ Failed to move file:', error.message);
      throw new Error(`Move file failed: ${error.message}`);
    }
  }

  /**
   * Update file details (tags, custom metadata)
   */
  async updateFileDetails(
    fileId: string,
    options: {
      tags?: string[];
      customMetadata?: Record<string, string | number | boolean>;
    }
  ): Promise<void> {
    if (!this.imagekit) {
      throw new Error('ImageKit not configured');
    }

    try {
      await this.imagekit.updateFileDetails(fileId, {
        tags: options.tags,
        customMetadata: options.customMetadata,
      });
      console.log(`✅ File details updated: ${fileId}`);
    } catch (error: any) {
      console.error('❌ Failed to update file details:', error.message);
      throw new Error(`Update file details failed: ${error.message}`);
    }
  }

  /**
   * Purge cache for a URL
   */
  async purgeCache(url: string): Promise<void> {
    if (!this.imagekit) {
      throw new Error('ImageKit not configured');
    }

    try {
      await this.imagekit.purgeCache(url);
      console.log(`✅ Cache purged for: ${url}`);
    } catch (error: any) {
      console.error('❌ Failed to purge cache:', error.message);
      throw new Error(`Purge cache failed: ${error.message}`);
    }
  }
}

// Types
export interface UploadResponse {
  fileId: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  filePath: string;
  fileType: string;
  size: number;
  width?: number;
  height?: number;
}

export interface Transformation {
  width?: string;
  height?: string;
  crop?: string;
  quality?: string;
  format?: string;
  blur?: string;
  rotation?: string;
  raw?: string;
  [key: string]: string | undefined;
}

// Singleton instance
let imageKitServiceInstance: ImageKitService | null = null;

export function getImageKitService(): ImageKitService {
  if (!imageKitServiceInstance) {
    imageKitServiceInstance = new ImageKitService();
  }
  return imageKitServiceInstance;
}

export const imageKitService = getImageKitService();
