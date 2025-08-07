# 🕉️ Shivgoraksha Ashram Management System

A comprehensive, enterprise-grade management system for Shivgoraksha Ashram built with **Next.js 15**, featuring appointment booking, queue management, spiritual consultations, and real-time communication.

## ✨ Features

### 🏛️ Core Ashram Management
- **Multi-Guruji Support** - Scalable system supporting multiple Gurujis (currently configured for single Guruji)
- **Appointment Booking** - Intelligent scheduling with conflict detection and business hours validation
- **Queue Management** - Real-time queue tracking and position updates with priority handling
- **Check-in System** - QR code and manual check-in with rate limiting protection
- **Spiritual Remedies** - Digital remedy prescriptions and templates with categorization
- **Multi-language Support** - English, Hindi, Marathi, Sanskrit, and regional languages

### 👥 User Management
- **Role-based Access Control** - Admin, Guruji, and User roles
- **Authentication** - Secure NextAuth.js integration
- **User Profiles** - Complete profile management
- **Notification System** - Real-time notifications and alerts

### 🚀 Technical Features
- **Progressive Web App (PWA)** - Full offline functionality
- **Real-time Updates** - Socket.IO integration for live updates
- **Next.js 15 Caching** - Advanced caching strategy replacing Redis
- **Enterprise Security** - Rate limiting, audit logging, error handling
- **TypeScript** - Full type safety throughout the application
- **Responsive Design** - Mobile-first approach with Tailwind CSS

### 📊 Analytics & Monitoring
- **Usage Analytics** - Comprehensive tracking and reporting
- **Performance Monitoring** - Real-time performance metrics with Core Web Vitals
- **Audit Logging** - Complete action tracking for compliance and security
- **Error Tracking** - Sentry integration for error monitoring and alerting
- **Socket.IO Admin UI** - Built-in WebSocket monitoring at `/admin/socket.io`
- **API Documentation** - Interactive Swagger/OpenAPI documentation

### 🌐 Admin Features
- **Interactive API Documentation** - Swagger UI with live API testing
- **Socket.IO Monitoring** - Real-time WebSocket connection monitoring
- **Language Management** - Multi-language support with dynamic switching
- **System Management** - Comprehensive admin controls and settings

## 🛠️ Technology Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component library
- **Framer Motion** - Animation library
- **React Hook Form** - Form management with Zod validation

### Backend
- **Next.js 15 Server Actions** - Secure server-side functions (No API routes)
- **React Server Components** - Server-side rendering with zero client JS
- **Prisma ORM** - Database management with full TypeScript support
- **PostgreSQL** - Primary database with audit logging
- **NextAuth.js** - Authentication system with role-based access
- **Zod** - Schema validation and input sanitization

### Real-time & Caching
- **Socket.IO** - Real-time bidirectional communication
- **Next.js Caching** - Built-in caching with custom memory cache
- **Unstable_cache** - Server-side caching strategy
- **Rate Limiting** - Memory-based rate limiting system

### DevOps & Monitoring
- **Sentry** - Error monitoring and performance tracking
- **Vercel Analytics** - Usage analytics
- **Web Vitals** - Performance monitoring
- **PWA** - Progressive Web App capabilities

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd aadhram-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/shivgoraksha_ashram"
   
   # NextAuth.js
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-nextauth-secret-key-here"
   
   # App Configuration
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   NEXT_PUBLIC_APP_NAME="Shivgoraksha Ashram"
   
   # Email (Optional - for notifications)
   RESEND_API_KEY="your-resend-api-key"
   FROM_EMAIL="noreply@shivgoraksha.ashram"
   
   # SMS (Optional - for notifications)
   TWILIO_ACCOUNT_SID="your-twilio-sid"
   TWILIO_AUTH_TOKEN="your-twilio-token"
   TWILIO_PHONE_NUMBER="your-twilio-phone"
   
   # Monitoring (Optional)
   SENTRY_DSN="your-sentry-dsn"
   NEXT_PUBLIC_VERCEL_ANALYTICS_ID="your-analytics-id"
   ```

4. **Database Setup**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push database schema
   npm run db:push
   
   # (Optional) Open Prisma Studio to view data
   npm run db:studio
   ```

5. **Initialize Shivgoraksha Ashram**
   ```bash
   # Run the automated setup script
   npm run setup:ashram
   ```

   This will create:
   - **Guruji Account**: `guruji@shivgoraksha.ashram` / `GurujiPassword@123`
   - **Admin Account**: `admin@shivgoraksha.ashram` / `AdminPassword@123`
   - System settings and sample spiritual remedies

6. **Start Development Server**
   ```bash
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000) to access the application.

## 📋 Available Scripts

### Development
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production application
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Database
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with sample data

### Setup
- `npm run setup:ashram` - Initialize Shivgoraksha Ashram with default data

### Testing
- `npm test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode

## 🏗️ Architecture Overview

### Modern Next.js 15 Architecture

The application uses a **layered architecture** with **Server Actions** replacing traditional API routes:

```
┌─────────────────────────────────────────┐
│        UI Layer (React Server Components) │
│  • Zero client-side JavaScript for data  │
│  • Parallel & Intercepting Routes        │
│  • Suspense boundaries                   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│            Server Actions               │
│  • Authentication & Authorization       │
│  • Input Validation (Zod)              │
│  • Business Logic Orchestration        │
│  • Cache Management                    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          Services & Repositories        │
│  • Complex Business Logic              │
│  • Data Access Layer                   │
│  • External Integrations               │
└─────────────────────────────────────────┘
```

### Server Actions Architecture

All business logic is handled by **Server Actions** organized by domain:

```typescript
// Server Action Pattern - Consistent across all domains
export async function createItem(formData: FormData) {
  // 1. Authentication Check
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // 2. Input Validation  
  const data = itemSchema.parse({
    name: formData.get('name'),
    // ... other fields
  });

  // 3. Business Logic
  const item = await prisma.item.create({ data });

  // 4. Cache Invalidation
  revalidatePath('/items');

  // 5. Consistent Response
  return { success: true, item };
}
```

### Server Actions Organization

```
src/lib/actions/
├── auth-actions.ts       # Authentication & user management
├── appointment-actions.ts # Appointment lifecycle
├── consultation-actions.ts # Medical consultations  
├── remedy-actions.ts     # Remedy prescriptions
├── notification-actions.ts # Notification system
├── user-actions.ts       # User CRUD operations
├── admin-actions.ts      # Admin dashboard
├── dashboard-actions.ts  # Analytics & reporting
├── system-actions.ts     # System health & monitoring
├── settings-actions.ts   # Configuration management
├── checkin-actions.ts    # QR code check-in
└── queue-actions.ts      # Real-time queue management
```

### Caching Strategy
Multi-layer caching with Next.js 15:

```typescript
// Server Actions with built-in caching
export const getCachedAppointments = cache(async (filters) => {
  return await prisma.appointment.findMany({ 
    where: buildFilterClause(filters) 
  });
});

// Automatic cache invalidation
export async function createAppointment(formData: FormData) {
  const appointment = await prisma.appointment.create({ data });
  
  // Granular cache invalidation
  revalidatePath('/appointments');
  revalidatePath('/dashboard');
  
  return { success: true, appointment };
}
```

### Real-time Communication
Socket.IO integration for live updates:

```typescript
// Server-side socket handling
io.on('connection', (socket) => {
  socket.on('join-queue', (queueId) => {
    socket.join(`queue-${queueId}`);
  });
  
  // Emit queue updates
  io.to(`queue-${queueId}`).emit('queue-updated', queueData);
});

// Client-side socket usage
const { socket, isConnected } = useSocket();
```

### Database Schema
Key entities in the Prisma schema:

- **User** - System users (Admin, Guruji, User roles)
- **Appointment** - Scheduled consultations
- **QueueEntry** - Real-time queue management
- **RemedyTemplate** - Spiritual remedy templates
- **Notification** - User notifications
- **AuditLog** - Complete action tracking
- **SystemSetting** - Configurable system parameters

## 🔐 Security Features

### Authentication & Authorization
- **NextAuth.js** - Secure session management
- **Role-based Access Control** - Granular permission system
- **Password Hashing** - bcryptjs with salt rounds
- **Session Management** - Secure token handling

### Rate Limiting
```typescript
// Memory-based rate limiting
export function applyRateLimitWithCache(
  identifier: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  // Implementation prevents abuse and ensures fair usage
}
```

### Data Protection
- **Input Validation** - Zod schema validation
- **SQL Injection Prevention** - Prisma ORM protection
- **XSS Protection** - Content Security Policy
- **CSRF Protection** - NextAuth.js built-in protection

## 📱 Progressive Web App (PWA)

### Features
- **Offline Functionality** - Works without internet connection
- **App-like Experience** - Native app feel on mobile devices
- **Push Notifications** - Real-time notification delivery
- **Installable** - Can be installed on home screen

### Configuration
```json
// manifest.json
{
  "name": "Shivgoraksha Ashram Management System",
  "short_name": "Shivgoraksha Ashram",
  "display": "standalone",
  "start_url": "/",
  "theme_color": "#0f172a"
}
```

## 🌐 API Documentation

### Interactive Documentation
Access the complete, interactive API documentation with live testing capabilities:
- **Admin URL**: `/admin/api-docs` (Admin users only)
- **Swagger/OpenAPI 3.0** compliant
- **Live API Testing** - Test endpoints directly from the documentation
- **Authentication Included** - Uses your current session for testing

### Key Server Actions

#### Authentication Actions (`auth-actions.ts`)
- `sendPhoneOTP()` - Send OTP for phone verification
- `verifyPhoneOTP()` - Verify OTP and authenticate
- `registerUser()` - User registration with validation
- `changePassword()` - Secure password change
- `addFamilyContact()` - Manage family contacts

#### Appointment Actions (`appointment-actions.ts`)
- `getAppointments()` - List appointments with advanced filtering
- `createAppointment()` - Book appointment with conflict detection
- `updateAppointment()` - Update appointment details
- `cancelAppointment()` - Cancel appointment with notifications
- `getAppointmentAvailability()` - Check time slot availability

#### Queue Actions (`queue-actions.ts`)
- `getQueueStatus()` - Real-time queue status
- `joinQueue()` - Join appointment queue
- `updateQueueStatus()` - Update queue position
- `leaveQueue()` - Leave queue system

#### User Actions (`user-actions.ts`)
- `getUser()` - Get user profile
- `updateUserProfile()` - Update profile information
- `getUserAppointments()` - Get user's appointments
- `toggleUserStatus()` - Admin user management

#### Admin Actions (`admin-actions.ts`)
- `getAdminDashboardStats()` - Complete dashboard analytics  
- `getSystemAlerts()` - System health alerts
- `getUsers()` - User management for admins

## 🔧 Configuration

### System Settings
The application can be configured through the SystemSetting model:

```typescript
// Key configuration options
ASHRAM_NAME: "Shivgoraksha Ashram"
GURUJI_NAME: "Shivgoraksha Guruji"
BUSINESS_HOURS_START: "09:00"
BUSINESS_HOURS_END: "18:00"
MAX_APPOINTMENTS_PER_DAY: "20"
APPOINTMENT_DURATION: "30" // minutes
```

### Environment Variables
Essential environment variables for production:

```env
# Required
DATABASE_URL=
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Optional but Recommended
SENTRY_DSN=
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
```

## 🌍 Multi-Language Support

### Supported Languages
The application supports multiple languages with real-time switching:

- **English** (en) - Default language
- **Hindi** (hi) - हिन्दी
- **Marathi** (mr) - मराठी  
- **Sanskrit** (sa) - संस्कृतम्
- **Gujarati** (gu) - ગુજરાતી
- **Bengali** (bn) - বাংলা
- **Tamil** (ta) - தமிழ்
- **Telugu** (te) - తెలుగు

### Language Switcher
- **Header Integration** - Language switcher in the main navigation
- **Persistent Preference** - Language preference saved in localStorage
- **Real-time Switching** - No page reload required
- **RTL Support** - Ready for right-to-left languages

## 📊 Monitoring & Analytics

### Real-time Monitoring
- **Socket.IO Admin UI** - Built-in WebSocket monitoring at `/admin/socket.io`
- **Connection Tracking** - Monitor active WebSocket connections
- **Event Debugging** - Real-time event stream monitoring
- **Room Management** - Socket.IO room and namespace management

### Error Monitoring
- **Sentry Integration** - Real-time error tracking
- **Performance Monitoring** - Core Web Vitals tracking
- **Custom Analytics** - User behavior analytics

### API Documentation & Testing
- **Interactive Swagger UI** - Complete API documentation with live testing
- **OpenAPI 3.0 Specification** - Standards-compliant API documentation
- **Admin Access** - Available at `/admin/api-docs` for administrators

### Audit Logging
All system actions are logged for compliance:

```typescript
// Audit log entry
{
  userId: "user-id",
  action: "APPOINTMENT_BOOKED",
  resource: "APPOINTMENT",
  resourceId: "appointment-id",
  timestamp: "2024-01-01T10:00:00Z",
  newData: { /* appointment details */ }
}
```

## 🚀 Deployment

### Vercel Deployment (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on git push

### Docker Deployment
```dockerfile
# Dockerfile included for containerized deployment
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Setup for Production
- Configure PostgreSQL database
- Set up SSL certificates
- Configure reverse proxy (nginx)
- Enable monitoring and logging

## 🤝 Contributing

### Development Guidelines
1. Follow TypeScript best practices
2. Use conventional commit messages
3. Write tests for new features
4. Update documentation as needed

### Code Style
- ESLint configuration enforced
- Prettier formatting
- TypeScript strict mode
- Tailwind CSS for styling

## 📄 License

This project is proprietary software developed for Shivgoraksha Ashram. All rights reserved.

## 🆘 Support

### Default Login Credentials
After running `npm run setup:ashram`:

**Guruji Account:**
- Email: `guruji@shivgoraksha.ashram`
- Password: `GurujiPassword@123`

**Admin Account:**
- Email: `admin@shivgoraksha.ashram`
- Password: `AdminPassword@123`

⚠️ **Important:** Change default passwords after first login!

### Troubleshooting

#### Common Issues

1. **Database Connection Issues**
   - Verify PostgreSQL is running
   - Check DATABASE_URL format
   - Ensure database exists

2. **Build Errors**
   - Run `npm run type-check` to identify TypeScript issues
   - Check ESLint output with `npm run lint`
   - Verify all dependencies are installed

3. **Socket Connection Issues**
   - Check server logs for Socket.IO errors
   - Verify CORS configuration
   - Ensure proper port configuration

#### Performance Optimization
- Enable Next.js caching in production
- Configure CDN for static assets
- Optimize database queries
- Monitor Core Web Vitals

### Support Contacts
- **Technical Issues:** Contact system administrator
- **Feature Requests:** Submit through appropriate channels
- **Emergency Support:** Available during business hours

## 🔄 Migration to Server Actions & RSC

### ✅ Completed Migration

The application has been successfully migrated from API routes to **Next.js Server Actions** and **React Server Components (RSC)**, following Next.js 15 best practices.

#### Migrated Components

1. **Dashboard Actions** - `src/lib/actions/dashboard-actions.ts`
   - Admin, Coordinator, and Guruji dashboard statistics
   - System alerts and usage reports

2. **System Actions** - `src/lib/actions/system-actions.ts`
   - System health, metrics, and monitoring
   - API documentation and cache management

3. **Authentication Actions** - `src/lib/actions/auth-actions.ts`
   - Phone OTP, user registration, family contacts
   - Password management and security

4. **Check-in Actions** - `src/lib/actions/checkin-actions.ts`
   - QR code and manual check-in functionality
   - Check-in history and statistics

5. **Settings Actions** - `src/lib/actions/settings-actions.ts`
   - System and user settings management
   - Privacy and notification preferences

6. **Queue Actions** - `src/lib/actions/queue-actions.ts`
   - Real-time queue management
   - Join, leave, and status updates

7. **Notification Actions** - `src/lib/actions/notification-actions.ts`
   - User notification management
   - Read/unread status and deletion

8. **Remedy Actions** - `src/lib/actions/remedy-actions.ts`
   - Remedy template management
   - Prescription and PDF generation

#### UI Components Updated

- **Admin Dashboard** - Server Components with Suspense
- **User Settings** - RSC with client-side forms
- **Create User Modal** - Intercepting routes with server actions
- **User List** - Server-side rendering with search
- **Settings Forms** - Client components with server action integration

#### Architecture Benefits

- **Performance** - Reduced client-side JavaScript
- **SEO** - Better server-side rendering
- **Security** - Server-side validation and authentication
- **Maintainability** - Centralized server actions
- **Caching** - Next.js built-in caching strategies
- **Type Safety** - Full TypeScript support

#### Removed Components

- **All API Routes** - Complete `src/app/api/` directory removed
- **Duplicate Functionality** - No redundant code
- **Client-side API Calls** - Replaced with direct server action calls

---

**🕉️ Built with devotion for Shivgoraksha Ashram Management**

*Last Updated: August 2025*
