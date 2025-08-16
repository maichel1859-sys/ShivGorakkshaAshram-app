# 🕉️ Shivgoraksha Ashram Management System

A comprehensive, enterprise-grade management system for Shivgoraksha Ashram built with **Next.js 15**, featuring appointment booking, queue management, spiritual consultations, and real-time updates using polling.

## ✨ Features

### 🏛️ Core Ashram Management
- **Multi-Guruji Support** - Scalable system supporting multiple Gurujis
- **Appointment Booking** - Intelligent scheduling with conflict detection and business hours validation
- **Queue Management** - Real-time queue tracking with adaptive polling (15-30 second intervals)
- **Location-Based QR Check-in** - Static QR codes per location for streamlined check-ins
- **Spiritual Remedies** - Digital remedy prescriptions and templates with categorization
- **Multi-language Support** - English, Hindi, Marathi, Sanskrit, and regional languages

### 👥 User Management
- **Role-based Access Control** - Admin, Guruji, Coordinator, and User roles
- **Authentication** - Secure NextAuth.js integration with phone OTP
- **User Profiles** - Complete profile management with family contacts
- **Notification System** - Real-time notifications with polling-based updates

### 🚀 Technical Features
- **Progressive Web App (PWA)** - Full offline functionality
- **Real-time Updates** - Adaptive polling system for live updates
- **Next.js 15 Caching** - Advanced caching strategy with revalidation
- **Enterprise Security** - Rate limiting, audit logging, error handling
- **TypeScript** - Full type safety throughout the application
- **Responsive Design** - Mobile-first approach with Tailwind CSS

### 📊 Analytics & Monitoring
- **Usage Analytics** - Comprehensive tracking and reporting
- **Performance Monitoring** - Real-time performance metrics
- **Audit Logging** - Complete action tracking for compliance and security
- **Error Tracking** - Comprehensive error monitoring and alerting
- **API Documentation** - Interactive documentation with examples

### 🌐 Admin Features
- **Interactive API Documentation** - Complete system documentation
- **QR Code Management** - Generate and download location-based QR codes
- **Language Management** - Multi-language support with dynamic switching
- **System Management** - Comprehensive admin controls and settings

## 🛠️ Technology Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Accessible component library
- **React Hook Form** - Form management with Zod validation
- **Zustand** - Lightweight state management

### Backend
- **Next.js 15 Server Actions** - Secure server-side functions
- **React Server Components** - Server-side rendering with zero client JS
- **Prisma ORM** - Database management with full TypeScript support
- **PostgreSQL** - Primary database with audit logging
- **NextAuth.js** - Authentication system with role-based access
- **Zod** - Schema validation and input sanitization

### Real-time & Caching
- **Adaptive Polling** - Smart polling intervals based on user state
- **Next.js Caching** - Built-in caching with custom memory cache
- **unstable_cache** - Server-side caching strategy
- **Rate Limiting** - Memory-based rate limiting system

### DevOps & Monitoring
- **Error Monitoring** - Comprehensive error tracking
- **Performance Monitoring** - Real-time performance metrics
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
   cd ShivGorakkshaAshram-app
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
   ```

4. **Database Setup**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Push database schema
   npx prisma db push
   
   # (Optional) Open Prisma Studio to view data
   npx prisma studio
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000) to access the application.

## 📋 Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build production application
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Database
- `npx prisma generate` - Generate Prisma client
- `npx prisma db push` - Push schema to database
- `npx prisma db migrate` - Run database migrations
- `npx prisma studio` - Open Prisma Studio

## 🏗️ Architecture Overview

### Modern Next.js 15 Architecture

The application uses a **layered architecture** with **Server Actions** and **React Server Components**:

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
├── dashboard-actions.ts  # Analytics & reporting
├── settings-actions.ts   # Configuration management
├── checkin-actions.ts    # QR code check-in
├── queue-actions.ts      # Real-time queue management
└── location-actions.ts   # Location-based QR codes
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
Adaptive polling system for live updates:

```typescript
// Adaptive polling hook
export function useAdaptivePolling(
  callback: () => void,
  dependencies: any[] = []
) {
  const [interval, setInterval] = useState(15000); // 15 seconds default
  
  useEffect(() => {
    const timer = setInterval(callback, interval);
    return () => clearInterval(timer);
  }, [callback, interval, ...dependencies]);
  
  return { interval, setInterval };
}
```

### Database Schema
Key entities in the Prisma schema:

- **User** - System users (Admin, Guruji, Coordinator, User roles)
- **Appointment** - Scheduled consultations
- **QueueEntry** - Real-time queue management
- **RemedyTemplate** - Spiritual remedy templates
- **Notification** - User notifications
- **ConsultationSession** - Consultation records
- **FamilyContact** - User family contacts

## 🔐 Security Features

### Authentication & Authorization
- **NextAuth.js** - Secure session management
- **Role-based Access Control** - Granular permission system
- **Phone OTP Verification** - Secure phone-based authentication
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

## 🏷️ Location-Based QR Code System

### Overview
The system uses **static QR codes** per location instead of individual appointment QR codes:

### QR Code Locations
- **Main Consultation Room** (`GURUJI_LOC_001`)
- **Waiting Area** (`GURUJI_LOC_002`)
- **Reception Desk** (`GURUJI_LOC_003`)

### How It Works
1. **Admin generates** location QR codes from `/admin/qr-codes`
2. **Print and stick** QR codes on walls at respective locations
3. **Users book appointments** normally (no individual QR codes)
4. **Users scan location QR** when they arrive
5. **System automatically** checks them in and adds to queue

### QR Code Data Format
```json
{
  "locationId": "GURUJI_LOC_001",
  "locationName": "Main Consultation Room",
  "timestamp": 1704067200000
}
```

### Admin QR Management
- **Generate QR Codes** - Create new location QR codes
- **Download QR Codes** - Print-ready QR code images
- **Location Management** - Add/remove locations as needed

## 🔄 Real-time Updates with Polling

### Adaptive Polling System
The application uses intelligent polling instead of WebSockets:

```typescript
// Polling intervals based on user state
const POLLING_INTERVALS = {
  IDLE: 30000,        // 30 seconds when idle
  WAITING: 15000,     // 15 seconds when in queue
  NEAR_FRONT: 10000,  // 10 seconds when near front
  CONSULTATION: 5000, // 5 seconds during consultation
  BACKGROUND: 60000   // 60 seconds when app in background
};
```

### Benefits of Polling
- **Simpler Architecture** - No WebSocket server complexity
- **Better Reliability** - Works behind firewalls and proxies
- **Easier Scaling** - Standard HTTP requests
- **Cost Effective** - No persistent connections

### Polling Hooks
- **useAdaptivePolling** - Smart polling based on context
- **usePollingNotifications** - Real-time notification updates
- **useQueuePolling** - Queue status updates

## 🌐 API Documentation

### Interactive Documentation
Access the complete, interactive API documentation:
- **Admin URL**: `/admin/api-docs` (Admin users only)
- **Server Actions** - All functions documented with examples
- **Live Testing** - Test functions directly from documentation

### Key Server Actions

#### Authentication Actions (`auth-actions.ts`)
- `sendPhoneOTP()` - Send OTP for phone verification
- `verifyPhoneOTP()` - Verify OTP and authenticate
- `registerUser()` - User registration with validation
- `changePassword()` - Secure password change
- `addFamilyContact()` - Manage family contacts

#### Appointment Actions (`appointment-actions.ts`)
- `getAppointments()` - List appointments with advanced filtering
- `bookAppointment()` - Book appointment with conflict detection
- `updateAppointment()` - Update appointment details
- `cancelAppointment()` - Cancel appointment with notifications
- `getAppointmentAvailability()` - Check time slot availability

#### Queue Actions (`queue-actions.ts`)
- `getQueueStatus()` - Real-time queue status
- `joinQueue()` - Join appointment queue
- `updateQueueStatus()` - Update queue position
- `leaveQueue()` - Leave queue system

#### Location Actions (`location-actions.ts`)
- `generateLocationQRCode()` - Create QR code for location
- `getLocationQRCodes()` - Get all location QR codes
- `validateLocationQRData()` - Validate QR code data

#### User Actions (`user-actions.ts`)
- `getUser()` - Get user profile
- `updateUserProfile()` - Update profile information
- `getUserAppointments()` - Get user's appointments
- `toggleUserStatus()` - Admin user management

## 🔧 Configuration

### System Settings
The application can be configured through environment variables and system settings:

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
- **Performance Monitoring** - Real-time performance metrics
- **Error Tracking** - Comprehensive error monitoring
- **User Analytics** - User behavior tracking

### Error Monitoring
- **Error Tracking** - Real-time error tracking
- **Performance Monitoring** - Core Web Vitals tracking
- **Custom Analytics** - User behavior analytics

### API Documentation & Testing
- **Interactive Documentation** - Complete system documentation with examples
- **Server Actions** - All functions documented with live testing
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
After initial setup:

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

3. **Polling Issues**
   - Check network connectivity
   - Verify server is running
   - Check browser console for errors

#### Performance Optimization
- Enable Next.js caching in production
- Configure CDN for static assets
- Optimize database queries
- Monitor Core Web Vitals

### Support Contacts
- **Technical Issues:** Contact system administrator
- **Feature Requests:** Submit through appropriate channels
- **Emergency Support:** Available during business hours

## 🔄 Recent Updates

### ✅ Completed Migrations

The application has been successfully updated with modern Next.js 15 features:

#### Removed Components
- **Socket.IO** - Replaced with adaptive polling system
- **WebSocket Server** - No longer needed
- **Custom Server** - Using Next.js built-in server
- **Individual QR Codes** - Replaced with location-based QR codes

#### New Features
- **Adaptive Polling** - Smart polling intervals based on user state
- **Location-Based QR Codes** - Static QR codes per location
- **Enhanced Caching** - Next.js 15 caching strategies
- **Improved Performance** - Reduced client-side JavaScript

#### Architecture Benefits
- **Simplified Architecture** - No WebSocket complexity
- **Better Reliability** - Works behind firewalls and proxies
- **Easier Scaling** - Standard HTTP requests
- **Cost Effective** - No persistent connections
- **Location-Based Check-in** - Streamlined user experience

---

**🕉️ Built with devotion for Shivgoraksha Ashram Management**

*Last Updated: January 2025*
