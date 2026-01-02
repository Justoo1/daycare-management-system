import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '@config/environment';
import { randomUUID } from 'crypto';
import * as path from 'path';

/**
 * File Upload Service using AWS S3
 */
export class FileUploadService {
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = config.aws.bucket;

    // Initialize S3 client only if credentials are provided
    if (config.aws.accessKeyId && config.aws.secretAccessKey) {
      this.s3Client = new S3Client({
        region: config.aws.region,
        credentials: {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey,
        },
      });
    } else {
      console.warn('⚠️  AWS S3 credentials not configured. File upload will not work.');
    }
  }

  /**
   * Upload file to S3
   * @param file - File buffer
   * @param fileName - Original file name
   * @param folder - Folder path in S3 (e.g., 'photos', 'documents', 'videos')
   * @param tenantId - Tenant ID for organization
   * @returns S3 file URL
   */
  async uploadFile(
    file: Buffer,
    fileName: string,
    folder: string,
    tenantId: string
  ): Promise<string> {
    if (!this.s3Client) {
      throw new Error('S3 client not configured. Please set AWS credentials.');
    }

    // Generate unique file name
    const fileExt = path.extname(fileName);
    const fileNameWithoutExt = path.basename(fileName, fileExt);
    const uniqueFileName = `${fileNameWithoutExt}-${randomUUID()}${fileExt}`;
    const key = `${tenantId}/${folder}/${uniqueFileName}`;

    // Determine content type
    const contentType = this.getContentType(fileExt);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    try {
      await this.s3Client.send(command);
      const fileUrl = `https://${this.bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
      console.log(`✅ File uploaded successfully: ${fileUrl}`);
      return fileUrl;
    } catch (error: any) {
      console.error('❌ Failed to upload file to S3:', error.message);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: Array<{ buffer: Buffer; fileName: string }>,
    folder: string,
    tenantId: string
  ): Promise<string[]> {
    const uploadPromises = files.map((file) =>
      this.uploadFile(file.buffer, file.fileName, folder, tenantId)
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Delete file from S3
   */
  async deleteFile(fileUrl: string): Promise<void> {
    if (!this.s3Client) {
      throw new Error('S3 client not configured');
    }

    try {
      // Extract key from URL
      const key = this.extractKeyFromUrl(fileUrl);

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      console.log(`✅ File deleted successfully: ${fileUrl}`);
    } catch (error: any) {
      console.error('❌ Failed to delete file from S3:', error.message);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * Generate presigned URL for temporary file access
   * @param fileUrl - S3 file URL
   * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
   */
  async getPresignedUrl(fileUrl: string, expiresIn: number = 3600): Promise<string> {
    if (!this.s3Client) {
      throw new Error('S3 client not configured');
    }

    try {
      const key = this.extractKeyFromUrl(fileUrl);

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      return presignedUrl;
    } catch (error: any) {
      console.error('❌ Failed to generate presigned URL:', error.message);
      throw new Error(`Presigned URL generation failed: ${error.message}`);
    }
  }

  /**
   * Validate file size
   */
  validateFileSize(fileSize: number, maxSizeMB: number = 10): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return fileSize <= maxSizeBytes;
  }

  /**
   * Validate file type
   */
  validateFileType(fileName: string, allowedTypes: string[]): boolean {
    const fileExt = path.extname(fileName).toLowerCase();
    return allowedTypes.includes(fileExt);
  }

  /**
   * Get content type from file extension
   */
  private getContentType(fileExt: string): string {
    const contentTypes: Record<string, string> = {
      // Images
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',

      // Documents
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

      // Videos
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.webm': 'video/webm',

      // Audio
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4',
    };

    return contentTypes[fileExt.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Extract S3 key from full URL
   */
  private extractKeyFromUrl(fileUrl: string): string {
    try {
      const url = new URL(fileUrl);
      // Remove leading slash
      return url.pathname.substring(1);
    } catch (error) {
      throw new Error('Invalid file URL');
    }
  }

  /**
   * Check if S3 is configured
   */
  isConfigured(): boolean {
    return this.s3Client !== undefined;
  }
}

// Singleton instance
let fileUploadServiceInstance: FileUploadService | null = null;

export function getFileUploadService(): FileUploadService {
  if (!fileUploadServiceInstance) {
    fileUploadServiceInstance = new FileUploadService();
  }
  return fileUploadServiceInstance;
}
