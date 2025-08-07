import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

interface SMSOptions {
  to: string;
  message: string;
  from?: string;
}

export async function sendSMS({
  to,
  message,
  from = process.env.TWILIO_PHONE_NUMBER
}: SMSOptions) {
  try {
    if (!from) {
      throw new Error('Twilio phone number not configured');
    }

    const result = await client.messages.create({
      body: message,
      from: from,
      to: to
    });

    console.log('SMS sent successfully:', result.sid);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return { success: false, error };
  }
}

// SMS templates for ashram management
export const smsTemplates = {
  appointmentConfirmation: (data: {
    userName: string;
    gurujiName: string;
    date: string;
    time: string;
  }) => ({
    message: `🕉️ Appointment Confirmed\n\nDear ${data.userName},\nYour appointment with ${data.gurujiName} is confirmed for ${data.date} at ${data.time}.\n\nPlease arrive 15 minutes early.\n\nOm Shanti 🙏`
  }),

  appointmentReminder: (data: {
    userName: string;
    gurujiName: string;
    date: string;
    time: string;
  }) => ({
    message: `🔔 Appointment Reminder\n\nDear ${data.userName},\nReminder: Your appointment with ${data.gurujiName} is tomorrow (${data.date}) at ${data.time}.\n\nPlease bring your QR code.\n\nOm Shanti 🙏`
  }),

  queueUpdate: (data: {
    userName: string;
    position: number;
    estimatedWait: number;
  }) => ({
    message: `📍 Queue Update\n\nDear ${data.userName},\nYour current position: ${data.position}\nEstimated wait: ${data.estimatedWait} minutes\n\nPlease be ready when your turn approaches.\n\nOm Shanti 🙏`
  }),

  remedyPrescription: (data: {
    userName: string;
    gurujiName: string;
    remedyName: string;
  }) => ({
    message: `🌿 Remedy Prescription\n\nDear ${data.userName},\n${data.gurujiName} has prescribed: ${data.remedyName}\n\nPlease check your email for detailed instructions.\n\nFollow the prescription regularly for best results.\n\nOm Shanti 🙏`
  }),

  emergencyContact: (data: {
    userName: string;
    emergencyContactName: string;
    message: string;
  }) => ({
    message: `🚨 Emergency Contact\n\nDear ${data.emergencyContactName},\nThis is regarding ${data.userName}:\n\n${data.message}\n\nPlease contact the ashram immediately.\n\nOm Shanti 🙏`
  })
};

// Send OTP via SMS
export async function sendOTP(phone: string, otp: string) {
  const message = `Your OTP for Ashram Management System is: ${otp}\n\nValid for 10 minutes.\n\nOm Shanti 🙏`;
  
  return sendSMS({
    to: phone,
    message: message
  });
}

// Generate OTP
export function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  
  return otp;
} 