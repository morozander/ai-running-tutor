import { Global, Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { S3Module } from './aws/s3/s3.module';
import { SqsModule } from './aws/sqs/sqs.module';
import { DatabaseModule } from './database/database.module';
import { GraphqlModule } from './graphql/graphql.module';
import { LoggingModule } from './logging/logging.module';
import { SendGridModule } from './sendgrid/sendgrid.module';
import { TelemetryModule } from './telemetry/telemetry.module';

@Global()
@Module({
  imports: [
    LoggingModule,
    DatabaseModule,
    AuthModule,
    GraphqlModule,
    TelemetryModule,
    S3Module,
    SqsModule,
    SendGridModule,
  ],
  exports: [LoggingModule, AuthModule, S3Module, SqsModule, SendGridModule],
})
export class CoreModule {}
