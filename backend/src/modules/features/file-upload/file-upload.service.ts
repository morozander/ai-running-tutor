import { S3Service } from '@core/aws/s3/s3.service';
import { Injectable, Logger } from '@nestjs/common';
import { Span } from 'nestjs-otel';
import type {
  PresignedDownloadUrlInput,
  PresignedDownloadUrlResponse,
  PresignedUploadUrlInput,
  PresignedUploadUrlResponse,
} from './dto/file-upload.input';

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);

  constructor(private readonly s3Service: S3Service) {}

  /**
   * Generate a presigned URL for the frontend to upload a file directly to S3
   */
  @Span('fileUpload.getPresignedUploadUrl')
  async getPresignedUploadUrl(input: PresignedUploadUrlInput): Promise<PresignedUploadUrlResponse> {
    this.logger.log(`Generating presigned upload URL for ${input.contentType}`);

    return this.s3Service.getPresignedUploadUrl(input.contentType, input.folder);
  }

  /**
   * Generate a presigned URL for the frontend to download a file from S3
   */
  @Span('fileUpload.getPresignedDownloadUrl')
  async getPresignedDownloadUrl(
    input: PresignedDownloadUrlInput,
  ): Promise<PresignedDownloadUrlResponse> {
    this.logger.log(`Generating presigned download URL for key: ${input.key}`);

    const expiresIn = 3600;
    const url = await this.s3Service.getPresignedUrl(input.key, expiresIn);

    return { url, key: input.key, expiresIn };
  }
}
