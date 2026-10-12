import { Module } from '@nestjs/common';
import { SendGridService } from './service/sendgrid.service';
import { EmailTemplateService } from './template/sendgrid.email-template';

@Module({
  providers: [SendGridService, EmailTemplateService],
  exports: [SendGridService, EmailTemplateService],
  controllers: [],
})
export class SendGridModule {}
