import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = process.env.FROM_EMAIL || 'noreply@ashram.com',
  attachments = []
}: EmailOptions) {
  try {
    // Ensure we have either html or text content
    const emailText = text || (html ? html.replace(/<[^>]*>/g, '') : 'No content');
    
    const result = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: html || emailText,
      text: emailText,
      attachments: attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        content_type: att.contentType
      }))
    });

    console.log('Email sent successfully:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
}

// Email templates
export const emailTemplates = {
  appointmentConfirmation: (data: {
    userName: string;
    gurujiName: string;
    date: string;
    time: string;
    qrCode: string;
  }) => ({
    subject: 'Appointment Confirmation - Ashram Management System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">🕉️ Appointment Confirmed</h2>
        <p>Dear ${data.userName},</p>
        <p>Your appointment has been confirmed with the following details:</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Guruji:</strong> ${data.gurujiName}</p>
          <p><strong>Date:</strong> ${data.date}</p>
          <p><strong>Time:</strong> ${data.time}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <img src="${data.qrCode}" alt="QR Code" style="width: 200px; height: 200px;"/>
          <p style="font-size: 14px; color: #666;">Show this QR code at the ashram for check-in</p>
        </div>
        
        <p><strong>Important Instructions:</strong></p>
        <ul>
          <li>Please arrive 15 minutes before your appointment time</li>
          <li>Bring this QR code (printed or on your phone)</li>
          <li>Check-in window opens 20 minutes before your appointment</li>
        </ul>
        
        <p>For any changes or cancellations, please contact us.</p>
        <p>Om Shanti 🙏</p>
      </div>
    `
  }),

  appointmentReminder: (data: {
    userName: string;
    gurujiName: string;
    date: string;
    time: string;
  }) => ({
    subject: 'Appointment Reminder - Tomorrow',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">🔔 Appointment Reminder</h2>
        <p>Dear ${data.userName},</p>
        <p>This is a friendly reminder about your upcoming appointment:</p>
        
        <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Guruji:</strong> ${data.gurujiName}</p>
          <p><strong>Date:</strong> ${data.date}</p>
          <p><strong>Time:</strong> ${data.time}</p>
        </div>
        
        <p>Please ensure you have your QR code ready for check-in.</p>
        <p>Om Shanti 🙏</p>
      </div>
    `
  }),

  remedyPrescription: (data: {
    userName: string;
    gurujiName: string;
    remedyName: string;
    pdfAttachment: string;
  }) => ({
    subject: 'Your Spiritual Remedy Prescription',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">🌿 Remedy Prescription</h2>
        <p>Dear ${data.userName},</p>
        <p>${data.gurujiName} has prescribed a spiritual remedy for you:</p>
        
        <div style="background: #f1f8e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Remedy:</strong> ${data.remedyName}</p>
          <p><strong>Prescribed by:</strong> ${data.gurujiName}</p>
        </div>
        
        <p>Please find the detailed prescription attached as a PDF document.</p>
        <p>Follow the instructions carefully and maintain regularity for best results.</p>
        <p>Om Shanti 🙏</p>
      </div>
    `
  }),

  queueUpdate: (data: {
    userName: string;
    position: number;
    estimatedWait: number;
  }) => ({
    subject: `Queue Update - Position ${data.position}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">📍 Queue Status Update</h2>
        <p>Dear ${data.userName},</p>
        
        <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="color: #f57c00; margin: 0;">Current Position: ${data.position}</h3>
          <p style="margin: 10px 0;">Estimated wait time: ${data.estimatedWait} minutes</p>
        </div>
        
        <p>Please be ready when your turn approaches. Thank you for your patience.</p>
        <p>Om Shanti 🙏</p>
      </div>
    `
  })
}; 