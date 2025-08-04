import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Shivgoraksha Ashram Management API',
    version: '1.0.0',
    description: 'Comprehensive API documentation for Shivgoraksha Ashram Management System',
    contact: {
      name: 'Shivgoraksha Ashram',
      email: 'admin@shivgoraksha.ashram'
    },
    license: {
      name: 'Proprietary',
      url: 'https://shivgoraksha.ashram'
    }
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      description: 'Development server'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your NextAuth session token'
      },
      SessionAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'next-auth.session-token',
        description: 'NextAuth session cookie'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'User ID' },
          name: { type: 'string', description: 'Full name' },
          email: { type: 'string', format: 'email', description: 'Email address' },
          phone: { type: 'string', description: 'Phone number' },
          role: { 
            type: 'string', 
            enum: ['USER', 'ADMIN', 'GURUJI'],
            description: 'User role'
          },
          isActive: { type: 'boolean', description: 'User status' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Appointment: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Appointment ID' },
          userId: { type: 'string', description: 'User ID' },
          gurujiId: { type: 'string', description: 'Guruji ID' },
          date: { type: 'string', format: 'date', description: 'Appointment date' },
          startTime: { type: 'string', description: 'Start time (HH:MM)' },
          endTime: { type: 'string', description: 'End time (HH:MM)' },
          status: {
            type: 'string',
            enum: ['BOOKED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
            description: 'Appointment status'
          },
          priority: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
            description: 'Appointment priority'
          },
          type: {
            type: 'string',
            enum: ['CONSULTATION', 'REMEDY_FOLLOWUP', 'SPIRITUAL_GUIDANCE', 'SPECIAL_PRAYER'],
            description: 'Appointment type'
          },
          notes: { type: 'string', description: 'Additional notes' },
          reminderSent: { type: 'boolean', description: 'Reminder notification status' },
          checkedInAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      QueueEntry: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Queue entry ID' },
          appointmentId: { type: 'string', description: 'Related appointment ID' },
          userId: { type: 'string', description: 'User ID' },
          gurujiId: { type: 'string', description: 'Guruji ID' },
          position: { type: 'integer', description: 'Queue position' },
          status: {
            type: 'string',
            enum: ['WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
            description: 'Queue status'
          },
          priority: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
            description: 'Priority level'
          },
          estimatedWait: { type: 'integer', description: 'Estimated wait time in minutes' },
          checkedInAt: { type: 'string', format: 'date-time' },
          startedAt: { type: 'string', format: 'date-time', nullable: true },
          completedAt: { type: 'string', format: 'date-time', nullable: true }
        }
      },
      Remedy: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Remedy ID' },
          name: { type: 'string', description: 'Remedy name' },
          type: {
            type: 'string',
            enum: ['SPIRITUAL', 'AYURVEDIC', 'MEDITATION', 'MANTRA', 'RITUAL'],
            description: 'Remedy type'
          },
          category: { type: 'string', description: 'Remedy category' },
          description: { type: 'string', description: 'Remedy description' },
          instructions: { type: 'string', description: 'Detailed instructions' },
          dosage: { type: 'string', description: 'Dosage or frequency' },
          duration: { type: 'string', description: 'Duration of remedy' },
          precautions: { type: 'string', description: 'Precautions and warnings' },
          language: { type: 'string', description: 'Language code' },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tags for categorization'
          },
          isActive: { type: 'boolean', description: 'Active status' }
        }
      },
      CreateAppointmentRequest: {
        type: 'object',
        required: ['date', 'startTime', 'type'],
        properties: {
          gurujiId: { type: 'string', description: 'Guruji ID (optional, defaults to primary Guruji)' },
          date: { type: 'string', format: 'date', description: 'Appointment date (YYYY-MM-DD)' },
          startTime: { type: 'string', description: 'Start time (HH:MM)' },
          type: {
            type: 'string',
            enum: ['CONSULTATION', 'REMEDY_FOLLOWUP', 'SPIRITUAL_GUIDANCE', 'SPECIAL_PRAYER'],
            description: 'Appointment type'
          },
          priority: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
            description: 'Priority level (defaults to MEDIUM)'
          },
          notes: { type: 'string', description: 'Additional notes or special requirements' }
        }
      },
      CheckInRequest: {
        type: 'object',
        required: ['appointmentId'],
        properties: {
          appointmentId: { type: 'string', description: 'Appointment ID to check in' },
          qrData: { type: 'string', description: 'QR code data (optional for manual check-in)' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', description: 'Error message' },
          message: { type: 'string', description: 'Detailed error description' },
          code: { type: 'string', description: 'Error code' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', description: 'Success status' },
          message: { type: 'string', description: 'Success message' },
          data: { type: 'object', description: 'Response data' }
        }
      }
    }
  },
  security: [
    {
      SessionAuth: []
    }
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and session management'
    },
    {
      name: 'Appointments',
      description: 'Appointment booking and management'
    },
    {
      name: 'Queue',
      description: 'Queue management and check-in system'
    },
    {
      name: 'Users',
      description: 'User profile and management'
    },
    {
      name: 'Remedies',
      description: 'Spiritual and Ayurvedic remedies'
    },
    {
      name: 'Admin',
      description: 'Administrative functions'
    },
    {
      name: 'Analytics',
      description: 'Usage analytics and reports'
    }
  ]
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/app/api/**/*.ts',
    './src/pages/api/**/*.ts',
    './docs/api-schemas.yaml'
  ],
};

export const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec;