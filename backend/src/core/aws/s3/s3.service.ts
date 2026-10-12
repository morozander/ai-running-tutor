import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { S3Config } from '@config/s3.config';
import { S3_CONFIG_KEY } from '@config/s3.config';
import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type UploadResult = {
  url: string;
  key: string;
};

export type FileUpload = {
  size: number;
  buffer: Buffer;
  mimetype: string;
  originalname: string;
};

export type PresignedUploadResult = {
  url: string;
  key: string;
  expiresIn: number;
};

/**
 * S3 Service for file uploads
 *
 * Features:
 * - Upload files to S3
 * - Generate presigned URLs for download
 * - Delete files
 * - MIME-type validation (PDF and images only)
 * - File size limits
 */
@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly config: S3Config;

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get<S3Config>(S3_CONFIG_KEY);
    if (!config) {
      throw new Error('S3 configuration not found');
    }
    this.config = config;

    this.client = new S3Client({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
  }

  /**
   * Upload a file to S3
   *
   * @param file - The file to upload
   * @param folder - Optional folder path in the bucket
   * @returns Upload result with URL and key
   */
  async uploadFile(file: FileUpload, folder: string = 'uploads'): Promise<UploadResult> {
    // Validate MIME type
    this.validateMimeType(file.mimetype);

    // Validate file size
    this.validateFileSize(file.size);

    // Generate unique key
    const extension = this.getExtensionFromMimeType(file.mimetype);
    const key = `${folder}/${randomUUID()}${extension}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        originalName: file.originalname,
      },
    });

    await this.client.send(command);

    // Generate URL
    const url = `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;

    return { url, key };
  }

  /**
   * Delete a file from S3
   *
   * @param key - The S3 object key
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  /**
   * Generate a presigned URL for downloading a file
   *
   * @param key - The S3 object key
   * @param expiresIn - URL expiration time in seconds (default: 1 hour)
   * @returns Presigned URL
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Generate a presigned URL for uploading a file directly from the frontend
   *
   * The frontend uses this URL to PUT the file directly to S3,
   * bypassing the backend for large file transfers.
   *
   * @param contentType - MIME type of the file to upload
   * @param folder - Optional folder path in the bucket
   * @param expiresIn - URL expiration time in seconds (default: 15 minutes)
   * @returns Presigned upload URL, the object key, and expiration
   */
  async getPresignedUploadUrl(
    contentType: string,
    folder: string = 'uploads',
    expiresIn: number = 900,
  ): Promise<PresignedUploadResult> {
    this.validateMimeType(contentType);

    const extension = this.getExtensionFromMimeType(contentType);
    const key = `${folder}/${randomUUID()}${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn });

    return { url, key, expiresIn };
  }

  /**
   * Validate MIME type
   *
   * Only allows PDF and image files (jpeg, png, gif, webp)
   */
  private validateMimeType(mimetype: string): void {
    if (!this.config.allowedMimeTypes.includes(mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${mimetype}. Allowed types: ${this.config.allowedMimeTypes.join(', ')}`,
      );
    }
  }

  /**
   * Validate file size
   *
   * Default max size: 10MB
   */
  private validateFileSize(size: number): void {
    const maxSizeBytes = this.config.maxFileSizeMb * 1024 * 1024;
    if (size > maxSizeBytes) {
      throw new BadRequestException(`File too large. Maximum size: ${this.config.maxFileSizeMb}MB`);
    }
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimetype: string): string {
    const mimeToExt: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };

    return mimeToExt[mimetype] || '';
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config.bucket && this.config.accessKeyId && this.config.secretAccessKey);
  }
}
