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
    // Format phone number (ensure it includes country code)
    const formattedPhone = to.startsWith('+') ? to : `+91${to}`;
    
    const result = await client.messages.create({
      body: message,
      from,
      to: formattedPhone
    });

    console.log('SMS sent successfully:', result.sid);
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return { success: false, error };
  }
}

// SMS templates
export const smsTemplates = {
  appointmentConfirmation: (data: {
    userName: string;
    gurujiName: string;
    date: string;
    time: string;
  }) => ({
    message: `🕉️ Appointment Confirmed
Hi ${data.userName},
Your appointment with ${data.gurujiName} is confirmed for ${data.date} at ${data.time}.
Please arrive 15 minutes early with your QR code.
Om Shanti 🙏`
  }),

  appointmentReminder: (data: {
    userName: string;
    gurujiName: string;
    date: string;
    time: string;
  }) => ({
    message: `🔔 Appointment Reminder
Hi ${data.userName},
Your appointment with ${data.gurujiName} is tomorrow at ${data.time}.
Don't forget to bring your QR code for check-in.
Om Shanti 🙏`
  }),

  queueUpdate: (data: {
    userName: string;
    position: number;
    estimatedWait: number;
  }) => ({
    message: `📍 Queue Update
Hi ${data.userName},
Your current position: ${data.position}
Estimated wait: ${data.estimatedWait} minutes
Please be ready when your turn approaches.
Om Shanti 🙏`
  }),

  checkInSuccess: (data: {
    userName: string;
    position: number;
    gurujiName: string;
  }) => ({
    message: `✅ Check-in Successful
Hi ${data.userName},
You're checked in for ${data.gurujiName}
Queue position: ${data.position}
Thank you for your patience.
Om Shanti 🙏`
  }),

  remedyNotification: (data: {
    userName: string;
    remedyName: string;
    gurujiName: string;
  }) => ({
    message: `🌿 Remedy Prescribed
Hi ${data.userName},
${data.gurujiName} has prescribed: ${data.remedyName}
Check your email for detailed instructions.
Om Shanti 🙏`
  }),

  appointmentCancellation: (data: {
    userName: string;
    date: string;
    time: string;
  }) => ({
    message: `❌ Appointment Cancelled
Hi ${data.userName},
Your appointment on ${data.date} at ${data.time} has been cancelled.
Please book a new appointment if needed.
Om Shanti 🙏`
  }),

  otp: (data: {
    otp: string;
    expiryMinutes: number;
  }) => ({
    message: `🔐 Your OTP for Ashram Management System
OTP: ${data.otp}
Valid for ${data.expiryMinutes} minutes.
Do not share this code with anyone.
Om Shanti 🙏`
  })
};

// OTP functions
export async function sendOTP(phone: string, otp: string) {
  const template = smsTemplates.otp({ otp, expiryMinutes: 5 });
  return await sendSMS({
    to: phone,
    message: template.message
  });
}

// Utility function to generate OTP
export function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}