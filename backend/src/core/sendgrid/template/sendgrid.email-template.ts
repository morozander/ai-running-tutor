import { Injectable } from '@nestjs/common';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export enum EmailTemplateType {
  WELCOME = 'welcome',
}

export interface TemplateParams {
  userName?: string;
}

@Injectable()
export class EmailTemplateService {
  /**
   * Generate welcome email template
   */
  generateWelcomeEmail(userName: string): EmailTemplate {
    const htmlContent = `
      <h1>Welcome, ${userName}!</h1>
      <p>Thank you for joining our platform.</p>
    `;

    const textContent = `Welcome, ${userName}!\n\nThank you for joining our platform.`;

    return {
      subject: 'Welcome to Our Platform!',
      html: htmlContent,
      text: textContent,
    };
  }

  /**
   * Get template by type - flexible method that handles all template types
   */
  getTemplate(type: EmailTemplateType, params: TemplateParams): EmailTemplate {
    const templateGenerators: Record<EmailTemplateType, () => EmailTemplate> = {
      [EmailTemplateType.WELCOME]: () => this.generateWelcomeEmail(params.userName!),
    };

    const generator = templateGenerators[type];

    if (!generator) {
      throw new Error(`Unknown email template type: ${type}`);
    }

    try {
      return generator();
    } catch (error) {
      throw new Error(
        `Failed to generate template '${type}': Missing required parameters. ${error.message}`,
      );
    }
  }
}
