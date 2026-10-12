import appConfig from '@config/app.config';
import awsConfig from '@config/aws.config';
import cognitoConfig from '@config/cognito.config';
import databaseConfig from '@config/database.config';
import s3Config from '@config/s3.config';
import sendGridConfig from '@config/sendgrid.config';
import sqsConfig from '@config/sqs.config';
import telemetryConfig from '@config/telemetry.config';
import { CoreModule } from '@core/core.module';
import { DomainModules } from '@modules/domain/domain.modules';
import { FeatureModules } from '@modules/features/feature.modules';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';

@Module({
  imports: [
    // Configuration - loaded first
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        awsConfig,
        telemetryConfig,
        cognitoConfig,
        s3Config,
        sendGridConfig,
        sqsConfig,
      ],
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
      cache: true, // Cache config for Lambda cold start optimization
    }),
    CqrsModule.forRoot(),
    CoreModule,
    DomainModules,
    FeatureModules,
  ],
})
export class AppModule {}
