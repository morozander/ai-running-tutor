import { Module } from '@nestjs/common';
import { CognitoWebhookModule } from './auth/cognito-webhook/cognito-webhook.module';
import { LoginModule } from './auth/login/login.module';
import { RegistrationModule } from './auth/registration/registration.module';
import { FileUploadModule } from './file-upload/file-upload.module';

/**
 * Aggregates all feature modules
 *
 * Feature modules contain:
 * - GraphQL Resolvers (API layer)
 * - REST Controllers (API layer)
 * - Feature services (use-case orchestration)
 * - DTOs for input/output
 * - CQRS commands for cross-module actions
 *
 * Feature modules CAN import domain modules for direct access.
 * For cross-feature communication, use CQRS.
 *
 * Feature Module Philosophy:
 * - Domain = "Noun" (What is it? What are its rules?)
 * - Feature = "Verb" / "User Intent" (What does the user do?)
 * - Features map to functional sections in the UI, not 1:1 with domains
 */
@Module({
  imports: [LoginModule, RegistrationModule, CognitoWebhookModule, FileUploadModule],
  exports: [LoginModule, RegistrationModule, CognitoWebhookModule, FileUploadModule],
})
export class FeatureModules {}
