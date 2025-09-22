// Email service for sending notifications
// This is a foundation that can be extended with various email providers

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  templateData?: Record<string, unknown>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Base email service interface
export interface EmailService {
  sendEmail(options: EmailOptions): Promise<EmailResult>;
  sendBulkEmail(emails: EmailOptions[]): Promise<EmailResult[]>;
}

// Console email service for development
export class ConsoleEmailService implements EmailService {
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    console.log('📧 [EMAIL SERVICE] Sending email:', {
      to: options.to,
      subject: options.subject,
      template: options.template,
      timestamp: new Date().toISOString(),
    });

    if (options.html) {
      console.log('📧 [EMAIL CONTENT]:', options.html.substring(0, 200) + '...');
    }

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      messageId: `console-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  async sendBulkEmail(emails: EmailOptions[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    for (const email of emails) {
      const result = await this.sendEmail(email);
      results.push(result);
    }

    return results;
  }
}

// SMTP Email Service (can be extended for various providers)
export class SMTPEmailService implements EmailService {
  private config: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
    from: string;
  };

  constructor(config: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
  }) {
    this.config = {
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      from: config.from,
    };
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      // This would use nodemailer or similar library in real implementation
      console.log('📧 [SMTP] Would send email via SMTP:', {
        to: options.to,
        subject: options.subject,
        from: this.config.from,
      });

      // TODO: Implement actual SMTP sending
      // const nodemailer = require('nodemailer');
      // const transporter = nodemailer.createTransporter(this.config);
      // const result = await transporter.sendMail({
      //   from: this.config.from,
      //   to: options.to,
      //   subject: options.subject,
      //   html: options.html,
      //   text: options.text,
      // });

      return {
        success: true,
        messageId: `smtp-${Date.now()}`,
      };
    } catch (error) {
      console.error('SMTP email error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMTP send failed',
      };
    }
  }

  async sendBulkEmail(emails: EmailOptions[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    for (const email of emails) {
      const result = await this.sendEmail(email);
      results.push(result);
    }

    return results;
  }
}

// Email template engine
export class EmailTemplateEngine {
  private templates = new Map<string, EmailTemplate>();

  constructor() {
    this.loadDefaultTemplates();
  }

  private loadDefaultTemplates() {
    // Appointment confirmation template
    this.templates.set('appointment-confirmation', {
      subject: 'Appointment Confirmation - ShivGorakkshaAshram',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Appointment Confirmed</h2>
          <p>Dear {{userName}},</p>
          <p>Your appointment has been confirmed for:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Date:</strong> {{appointmentDate}}</p>
            <p><strong>Time:</strong> {{appointmentTime}}</p>
            <p><strong>Guruji:</strong> {{gurujiName}}</p>
            <p><strong>Location:</strong> {{location}}</p>
          </div>
          <p>Please arrive 15 minutes early for check-in.</p>
          <p>Best regards,<br>ShivGorakkshaAshram Team</p>
        </div>
      `,
      textContent: `
        Appointment Confirmed

        Dear {{userName}},

        Your appointment has been confirmed for:
        Date: {{appointmentDate}}
        Time: {{appointmentTime}}
        Guruji: {{gurujiName}}
        Location: {{location}}

        Please arrive 15 minutes early for check-in.

        Best regards,
        ShivGorakkshaAshram Team
      `,
    });

    // Appointment reminder template
    this.templates.set('appointment-reminder', {
      subject: 'Appointment Reminder - Tomorrow at {{appointmentTime}}',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Appointment Reminder</h2>
          <p>Dear {{userName}},</p>
          <p>This is a reminder of your upcoming appointment:</p>
          <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Tomorrow at {{appointmentTime}}</strong></p>
            <p><strong>Guruji:</strong> {{gurujiName}}</p>
            <p><strong>Location:</strong> {{location}}</p>
          </div>
          <p>Please remember to arrive 15 minutes early.</p>
          <p>Best regards,<br>ShivGorakkshaAshram Team</p>
        </div>
      `,
      textContent: `
        Appointment Reminder

        Dear {{userName}},

        This is a reminder of your upcoming appointment:
        Tomorrow at {{appointmentTime}}
        Guruji: {{gurujiName}}
        Location: {{location}}

        Please remember to arrive 15 minutes early.

        Best regards,
        ShivGorakkshaAshram Team
      `,
    });

    // Remedy prescribed template
    this.templates.set('remedy-prescribed', {
      subject: 'Your Remedy Prescription - ShivGorakkshaAshram',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">Remedy Prescribed</h2>
          <p>Dear {{userName}},</p>
          <p>{{gurujiName}} has prescribed a remedy for you:</p>
          <div style="background: #faf5ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Remedy:</strong> {{remedyName}}</p>
            <p><strong>Instructions:</strong> {{instructions}}</p>
            <p><strong>Duration:</strong> {{duration}}</p>
          </div>
          <p>Please follow the instructions carefully and contact us if you have any questions.</p>
          <p>Best regards,<br>ShivGorakkshaAshram Team</p>
        </div>
      `,
      textContent: `
        Remedy Prescribed

        Dear {{userName}},

        {{gurujiName}} has prescribed a remedy for you:
        Remedy: {{remedyName}}
        Instructions: {{instructions}}
        Duration: {{duration}}

        Please follow the instructions carefully and contact us if you have any questions.

        Best regards,
        ShivGorakkshaAshram Team
      `,
    });

    // Queue position update
    this.templates.set('queue-position-update', {
      subject: 'Queue Update - Position {{position}}',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ea580c;">Queue Position Update</h2>
          <p>Dear {{userName}},</p>
          <p>Your current position in the queue: <strong>{{position}}</strong></p>
          <p>Estimated wait time: <strong>{{estimatedWait}}</strong></p>
          <p>Thank you for your patience.</p>
          <p>Best regards,<br>ShivGorakkshaAshram Team</p>
        </div>
      `,
      textContent: `
        Queue Position Update

        Dear {{userName}},

        Your current position in the queue: {{position}}
        Estimated wait time: {{estimatedWait}}

        Thank you for your patience.

        Best regards,
        ShivGorakkshaAshram Team
      `,
    });
  }

  getTemplate(templateName: string): EmailTemplate | undefined {
    return this.templates.get(templateName);
  }

  renderTemplate(templateName: string, data: Record<string, unknown>): EmailTemplate | null {
    const template = this.getTemplate(templateName);
    if (!template) return null;

    const rendered: EmailTemplate = {
      subject: this.replaceVariables(template.subject, data),
      htmlContent: this.replaceVariables(template.htmlContent, data),
      textContent: this.replaceVariables(template.textContent, data),
    };

    return rendered;
  }

  private replaceVariables(content: string, data: Record<string, unknown>): string {
    let result = content;

    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }

    return result;
  }

  addTemplate(name: string, template: EmailTemplate) {
    this.templates.set(name, template);
  }
}

// Email service factory
export function createEmailService(): EmailService {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment || !process.env.SMTP_HOST) {
    return new ConsoleEmailService();
  }

  return new SMTPEmailService({
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
    from: process.env.SMTP_FROM || 'noreply@shivgoraksha-ashram.com',
  });
}

// Global email service instance
export const emailService = createEmailService();
export const emailTemplateEngine = new EmailTemplateEngine();

// Helper functions
export async function sendTemplateEmail(
  to: string | string[],
  templateName: string,
  templateData: Record<string, unknown>
): Promise<EmailResult> {
  const template = emailTemplateEngine.renderTemplate(templateName, templateData);

  if (!template) {
    return {
      success: false,
      error: `Template '${templateName}' not found`,
    };
  }

  return emailService.sendEmail({
    to,
    subject: template.subject,
    html: template.htmlContent,
    text: template.textContent,
  });
}

export async function sendAppointmentConfirmation(
  userEmail: string,
  data: {
    userName: string;
    appointmentDate: string;
    appointmentTime: string;
    gurujiName: string;
    location: string;
  }
): Promise<EmailResult> {
  return sendTemplateEmail(userEmail, 'appointment-confirmation', data);
}

export async function sendAppointmentReminder(
  userEmail: string,
  data: {
    userName: string;
    appointmentTime: string;
    gurujiName: string;
    location: string;
  }
): Promise<EmailResult> {
  return sendTemplateEmail(userEmail, 'appointment-reminder', data);
}

export async function sendRemedyPrescription(
  userEmail: string,
  data: {
    userName: string;
    gurujiName: string;
    remedyName: string;
    instructions: string;
    duration: string;
  }
): Promise<EmailResult> {
  return sendTemplateEmail(userEmail, 'remedy-prescribed', data);
}

export async function sendQueuePositionUpdate(
  userEmail: string,
  data: {
    userName: string;
    position: number;
    estimatedWait: string;
  }
): Promise<EmailResult> {
  return sendTemplateEmail(userEmail, 'queue-position-update', data);
}