import { AuthGuard } from '@core/auth/guards/auth.guard';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  PresignedDownloadUrlInput,
  PresignedDownloadUrlResponse,
  PresignedUploadUrlInput,
  PresignedUploadUrlResponse,
} from './dto/file-upload.input';
import { FileUploadService } from './file-upload.service';

/**
 * GraphQL resolver for file upload operations
 *
 * Provides presigned URLs so the frontend can upload/download
 * files directly to/from S3 without proxying through the backend.
 */
@Resolver()
@UseGuards(AuthGuard)
export class FileUploadResolver {
  constructor(private readonly fileUploadService: FileUploadService) {}

  /**
   * Get a presigned URL for uploading a file to S3
   *
   * The frontend uses this URL to PUT the file directly to S3.
   * Flow: frontend -> getPresignedUploadUrl -> PUT file to S3 URL -> save key in DB
   */
  @Mutation(() => PresignedUploadUrlResponse, {
    description: 'Generate a presigned URL for uploading a file directly to S3',
  })
  async getPresignedUploadUrl(
    @Args('input') input: PresignedUploadUrlInput,
  ): Promise<PresignedUploadUrlResponse> {
    return this.fileUploadService.getPresignedUploadUrl(input);
  }

  /**
   * Get a presigned URL for downloading a file from S3
   *
   * The frontend uses this URL to GET the file directly from S3.
   */
  @Query(() => PresignedDownloadUrlResponse, {
    description: 'Generate a presigned URL for downloading a file from S3',
  })
  async getPresignedDownloadUrl(
    @Args('input') input: PresignedDownloadUrlInput,
  ): Promise<PresignedDownloadUrlResponse> {
    return this.fileUploadService.getPresignedDownloadUrl(input);
  }
}
