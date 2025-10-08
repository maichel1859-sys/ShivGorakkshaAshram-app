// Payment service foundation for ShivGorakkshaAshram
// Supports multiple payment providers (Stripe, Razorpay, etc.)

export interface PaymentAmount {
  currency: string;
  amount: number; // in smallest unit (e.g., paise for INR)
}

export interface PaymentCustomer {
  id?: string;
  email: string;
  name: string;
  phone?: string;
}

export interface PaymentItem {
  id: string;
  name: string;
  description?: string;
  amount: PaymentAmount;
  quantity?: number;
}

export interface PaymentOptions {
  amount: PaymentAmount;
  customer: PaymentCustomer;
  items?: PaymentItem[];
  description?: string;
  metadata?: Record<string, string>;
  redirectUrl?: string;
  webhookUrl?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  paymentUrl?: string;
  status?: 'pending' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentStatus {
  id: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  amount: PaymentAmount;
  paidAt?: Date;
  failureReason?: string;
  metadata?: Record<string, unknown>;
}

// Base payment service interface
export interface PaymentService {
  createPayment(options: PaymentOptions): Promise<PaymentResult>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatus | null>;
  refundPayment(paymentId: string, amount?: number): Promise<PaymentResult>;
  verifyWebhook(payload: string, signature: string): boolean;
}

// Mock payment service for development
export class MockPaymentService implements PaymentService {
  private payments = new Map<string, PaymentStatus>();

  async createPayment(options: PaymentOptions): Promise<PaymentResult> {
    const paymentId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Simulate payment creation
    console.log('💳 [MOCK PAYMENT] Creating payment:', {
      paymentId,
      amount: options.amount,
      customer: options.customer.email,
      description: options.description,
    });

    // Store payment status
    this.payments.set(paymentId, {
      id: paymentId,
      status: 'pending',
      amount: options.amount,
      metadata: options.metadata,
    });

    // Simulate payment URL
    const paymentUrl = `/payment/mock/${paymentId}`;

    return {
      success: true,
      paymentId,
      paymentUrl,
      status: 'pending',
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus | null> {
    const payment = this.payments.get(paymentId);

    if (!payment) {
      return null;
    }

    // Simulate random payment completion for demo
    if (payment.status === 'pending' && Math.random() > 0.5) {
      payment.status = 'completed';
      payment.paidAt = new Date();
      console.log('💳 [MOCK PAYMENT] Payment completed:', paymentId);
    }

    return payment;
  }

  async refundPayment(paymentId: string, amount?: number): Promise<PaymentResult> {
    const payment = this.payments.get(paymentId);

    if (!payment) {
      return {
        success: false,
        error: 'Payment not found',
      };
    }

    // Log refund amount for debugging (mock implementation)
    console.log('Mock refund amount:', amount || payment.amount);

    if (payment.status !== 'completed') {
      return {
        success: false,
        error: 'Payment not completed, cannot refund',
      };
    }

    // Update payment status
    payment.status = 'refunded';
    console.log('💳 [MOCK PAYMENT] Payment refunded:', paymentId);

    return {
      success: true,
      paymentId,
      status: 'completed',
    };
  }

  verifyWebhook(payload: string, signature: string): boolean {
    // Mock webhook verification - log payload and signature for debugging
    console.log('💳 [MOCK PAYMENT] Webhook verified for payload length:', payload.length, 'signature length:', signature.length);
    return true;
  }
}

// Razorpay service (popular in India)
export class RazorpayService implements PaymentService {
  private keyId: string;
  private keySecret: string;

  constructor(keyId: string, keySecret: string) {
    this.keyId = keyId;
    this.keySecret = keySecret;
  }

  async createPayment(options: PaymentOptions): Promise<PaymentResult> {
    try {
      console.log('💳 [RAZORPAY] Creating payment order:', options);

      // TODO: Implement Razorpay integration
      // const Razorpay = require('razorpay');
      // const razorpay = new Razorpay({
      //   key_id: this.keyId,
      //   key_secret: this.keySecret,
      // });

      // const order = await razorpay.orders.create({
      //   amount: options.amount.amount,
      //   currency: options.amount.currency,
      //   receipt: `receipt_${Date.now()}`,
      //   notes: options.metadata,
      // });

      return {
        success: true,
        paymentId: `razorpay_${Date.now()}`,
        status: 'pending',
      };

    } catch (error) {
      console.error('Razorpay payment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment creation failed',
      };
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus | null> {
    try {
      // TODO: Implement Razorpay payment status check
      // const payment = await razorpay.payments.fetch(paymentId);

      return {
        id: paymentId,
        status: 'pending',
        amount: { currency: 'INR', amount: 0 },
      };

    } catch (error) {
      console.error('Razorpay status check error:', error);
      return null;
    }
  }

  async refundPayment(paymentId: string, amount?: number): Promise<PaymentResult> {
    try {
      // TODO: Implement Razorpay refund
      console.log('💳 [RAZORPAY] Refunding payment:', paymentId, 'amount:', amount);

      return {
        success: true,
        paymentId,
        status: 'completed',
      };

    } catch (error) {
      console.error('Razorpay refund error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund failed',
      };
    }
  }

  verifyWebhook(payload: string, signature: string): boolean {
    try {
      // TODO: Implement Razorpay webhook verification
      console.log('💳 [RAZORPAY] Verifying webhook payload length:', payload.length, 'signature:', signature.slice(0, 10) + '...');
      // const crypto = require('crypto');
      // const expectedSignature = crypto
      //   .createHmac('sha256', this.keySecret)
      //   .update(payload)
      //   .digest('hex');

      // return signature === expectedSignature;

      return true;
    } catch (error) {
      console.error('Razorpay webhook verification error:', error);
      return false;
    }
  }
}

// Stripe service (international)
export class StripeService implements PaymentService {
  private secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  async createPayment(options: PaymentOptions): Promise<PaymentResult> {
    try {
      console.log('💳 [STRIPE] Creating payment intent:', options);

      // TODO: Implement Stripe integration
      // const stripe = require('stripe')(this.secretKey);

      // const paymentIntent = await stripe.paymentIntents.create({
      //   amount: options.amount.amount,
      //   currency: options.amount.currency,
      //   customer_email: options.customer.email,
      //   description: options.description,
      //   metadata: options.metadata,
      // });

      return {
        success: true,
        paymentId: `stripe_${Date.now()}`,
        status: 'pending',
      };

    } catch (error) {
      console.error('Stripe payment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment creation failed',
      };
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus | null> {
    try {
      // TODO: Implement Stripe payment status check
      // const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);

      return {
        id: paymentId,
        status: 'pending',
        amount: { currency: 'USD', amount: 0 },
      };

    } catch (error) {
      console.error('Stripe status check error:', error);
      return null;
    }
  }

  async refundPayment(paymentId: string, amount?: number): Promise<PaymentResult> {
    try {
      // TODO: Implement Stripe refund
      console.log('💳 [STRIPE] Refunding payment:', paymentId, 'amount:', amount);

      return {
        success: true,
        paymentId,
        status: 'completed',
      };

    } catch (error) {
      console.error('Stripe refund error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund failed',
      };
    }
  }

  verifyWebhook(payload: string, signature: string): boolean {
    try {
      // TODO: Implement Stripe webhook verification
      console.log('💳 [STRIPE] Verifying webhook payload length:', payload.length, 'signature length:', signature.length);
      // const stripe = require('stripe')(this.secretKey);
      // const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      // const event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);

      return true;
    } catch (error) {
      console.error('Stripe webhook verification error:', error);
      return false;
    }
  }
}

// Payment service factory
export function createPaymentService(): PaymentService {
  const provider = process.env.PAYMENT_PROVIDER || 'mock';

  switch (provider.toLowerCase()) {
    case 'razorpay':
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        console.warn('Razorpay credentials not found, using mock payment service');
        return new MockPaymentService();
      }
      return new RazorpayService(
        process.env.RAZORPAY_KEY_ID,
        process.env.RAZORPAY_KEY_SECRET
      );

    case 'stripe':
      if (!process.env.STRIPE_SECRET_KEY) {
        console.warn('Stripe credentials not found, using mock payment service');
        return new MockPaymentService();
      }
      return new StripeService(process.env.STRIPE_SECRET_KEY);

    default:
      return new MockPaymentService();
  }
}

// Global payment service instance
export const paymentService = createPaymentService();

// Helper functions for common payment scenarios
export async function createAppointmentPayment(
  appointmentId: string,
  amount: number,
  customer: PaymentCustomer
): Promise<PaymentResult> {
  return paymentService.createPayment({
    amount: {
      currency: 'INR',
      amount: amount * 100, // Convert to paise
    },
    customer,
    description: `Payment for appointment ${appointmentId}`,
    metadata: {
      type: 'appointment',
      appointmentId,
    },
  });
}

export async function createConsultationPayment(
  consultationId: string,
  amount: number,
  customer: PaymentCustomer
): Promise<PaymentResult> {
  return paymentService.createPayment({
    amount: {
      currency: 'INR',
      amount: amount * 100, // Convert to paise
    },
    customer,
    description: `Payment for consultation ${consultationId}`,
    metadata: {
      type: 'consultation',
      consultationId,
    },
  });
}

export async function createRemedyPayment(
  remedyId: string,
  amount: number,
  customer: PaymentCustomer
): Promise<PaymentResult> {
  return paymentService.createPayment({
    amount: {
      currency: 'INR',
      amount: amount * 100, // Convert to paise
    },
    customer,
    description: `Payment for remedy ${remedyId}`,
    metadata: {
      type: 'remedy',
      remedyId,
    },
  });
}

// Donation payment
export async function createDonationPayment(
  amount: number,
  customer: PaymentCustomer,
  purpose?: string
): Promise<PaymentResult> {
  return paymentService.createPayment({
    amount: {
      currency: 'INR',
      amount: amount * 100, // Convert to paise
    },
    customer,
    description: `Donation to ShivGorakkshaAshram${purpose ? ` - ${purpose}` : ''}`,
    metadata: {
      type: 'donation',
      purpose: purpose || 'general',
    },
  });
}