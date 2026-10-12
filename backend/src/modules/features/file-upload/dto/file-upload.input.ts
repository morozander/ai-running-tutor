import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

/**
 * Input for requesting a presigned upload URL
 */
@InputType()
export class PresignedUploadUrlInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @Matches(
    /^(application\/pdf|image\/(jpeg|png|gif|webp))$/,
    { message: 'Allowed types: application/pdf, image/jpeg, image/png, image/gif, image/webp' },
  )
  contentType!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  folder?: string;
}

/**
 * Input for requesting a presigned download URL
 */
@InputType()
export class PresignedDownloadUrlInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  key!: string;
}

/**
 * Response containing a presigned upload URL
 */
@ObjectType()
export class PresignedUploadUrlResponse {
  @Field()
  url!: string;

  @Field()
  key!: string;

  @Field()
  expiresIn!: number;
}

/**
 * Response containing a presigned download URL
 */
@ObjectType()
export class PresignedDownloadUrlResponse {
  @Field()
  url!: string;

  @Field()
  key!: string;

  @Field()
  expiresIn!: number;
}
