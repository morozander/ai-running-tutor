import type { SendGridConfig } from '@config/sendgrid.config';
import { SENDGRID_CONFIG_KEY } from '@config/sendgrid.config';
import { AppLogger } from '@core/logging/app-logger.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MailContent, MailDataRequired } from '@sendgrid/helpers/classes/mail';
import sgMail from '@sendgrid/mail';
import {
  EmailTemplateService,
  EmailTemplateType,
  TemplateParams,
} from '../template/sendgrid.email-template';

export interface EmailData {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

/**
 * SendGrid Service for sending emails
 *
 * Features:
 * - Send transactional emails
 * - Support for both HTML and text content
 * - Configurable sender information
 * - Error handling and logging
 */
@Injectable()
export class SendGridService implements OnModuleInit {
  private config: SendGridConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
    private readonly emailTemplateService: EmailTemplateService,
  ) {
    this.logger.setContext('SendGridService');
    const config = this.configService.get<SendGridConfig>(SENDGRID_CONFIG_KEY);
    if (!config) {
      throw new Error('SendGrid configuration not found');
    }
    this.config = config;

    if (!this.config.apiKey) {
      this.logger.warn('SendGrid API key not configured. Email sending will be disabled.');
    }
  }

  async onModuleInit() {
    if (this.config.apiKey) {
      sgMail.setApiKey(this.config.apiKey);
    }
  }

  /**
   * Send an email
   *
   * @param data - Email data including recipients, subject, and content
   */
  async send(data: EmailData): Promise<void> {
    if (!this.config.apiKey) {
      this.logger.error('SendGrid not configured. Cannot send email.');
      throw new Error('SendGrid API key not configured');
    }

    const content: MailContent[] = [];

    if (data.text) {
      content.push({
        type: 'text/plain',
        value: data.text,
      });
    }

    if (data.html) {
      content.push({
        type: 'text/html',
        value: data.html,
      });
    }

    this.logger.debug('Sending email', {
      to: Array.isArray(data.to) ? data.to : [data.to],
      subject: data.subject,
    });

    try {
      let mailData: MailDataRequired;

      if (content.length > 0) {
        const mailDataWithContent: MailDataRequired = {
          to: data.to,
          from: data.from || this.config.fromEmail,
          subject: data.subject,
          content: content as MailContent[] & [MailContent], // Non-empty array type assertion
        };

        const htmlContent = content.find((item) => item.type === 'text/html');
        if (htmlContent) {
          const textContent = content.find((item) => item.type === 'text/plain');
          if (!textContent) {
            const plainText = htmlContent.value.replace(/<[^>]*>/g, '');
            mailDataWithContent.text = plainText;
          }
        }

        mailData = mailDataWithContent;
      } else {
        if (data.text || data.html) {
          const fallbackContent: MailContent[] = [];
          if (data.html) {
            fallbackContent.push({ type: 'text/html', value: data.html });
          }
          if (data.text) {
            fallbackContent.push({ type: 'text/plain', value: data.text });
          }
          if (fallbackContent.length === 0) {
            throw new Error('Unexpected error: fallbackContent should not be empty');
          }

          mailData = {
            to: data.to,
            from: data.from || this.config.fromEmail,
            subject: data.subject,
            content: fallbackContent as MailContent[] & [MailContent],
          };
        } else {
          throw new Error('Email must have either text, html, content, or templateId');
        }
      }

      await sgMail.send(mailData);
      this.logger.log('Email sent successfully', {
        to: Array.isArray(data.to) ? data.to : [data.to],
        subject: data.subject,
      });
    } catch (error) {
      this.logger.error('Failed to send email', {
        to: Array.isArray(data.to) ? data.to : [data.to],
        subject: data.subject,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Send email by template type
   */
  async sendEmailByTemplate(
    to: string,
    type: EmailTemplateType,
    params: TemplateParams,
  ): Promise<void> {
    const template = this.emailTemplateService.getTemplate(type, params);

    await this.send({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!this.config.apiKey;
  }
}
