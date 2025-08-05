# 🕉️ Ashram Management System - Setup Guide

Complete setup guide for the Shivgoraksha Ashram Management System.

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** (v13 or higher) 
- **npm** or **yarn**

## 🚀 Quick Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd aadhram-app
npm install
```

### 2. Environment Configuration

Copy the environment template:
```bash
cp .env.example .env
```

Update your `.env` file with the following required variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/ashram_db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_long_random_secret_key_here"

# Google OAuth (Optional - for Google Sign-In)
GOOGLE_CLIENT_ID="your_google_oauth_client_id"
GOOGLE_CLIENT_SECRET="your_google_oauth_client_secret"
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push

# Seed database with initial users and data
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

## 👥 Default User Accounts

After running `npm run db:seed`, you'll have the following accounts:

### 🔐 Login Credentials

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| **Admin** | admin@ashram.com | password123 | System Administrator |
| **Coordinator** | coordinator@ashram.com | password123 | Appointment Coordinator |
| **Guruji** | ravi.kumar@ashram.com | password123 | Meditation & Spiritual Guidance |
| **Guruji** | priya.sharma@ashram.com | password123 | Ayurvedic Healing |
| **Guruji** | anand.singh@ashram.com | password123 | Yoga Therapy |
| **Guruji** | meera.devi@ashram.com | password123 | Chakra Balancing |
| **User** | amit.patel@example.com | password123 | Regular User |

## 🔧 Available Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema to database
npm run db:migrate      # Run database migrations
npm run db:seed         # Seed database with initial data
npm run db:reset        # Reset database and re-seed
npm run db:studio       # Open Prisma Studio

# Testing & Quality
npm run lint            # Run ESLint
npm run type-check      # Run TypeScript check
npm test               # Run tests
```

## 🌟 Features Included After Seeding

### 👤 **User Management**
- Admin, Coordinator, Guruji, and User roles
- Complete user profiles with emergency contacts
- Active/inactive user status

### 📅 **Appointment System**
- Pre-scheduled appointments for the next 7 days
- Different appointment statuses (Booked, Confirmed, Completed)
- Priority levels (Low, Normal, High, Urgent)
- QR code generation for check-ins

### 🏥 **Consultation Records**
- Historical consultation data
- Treatment notes and diagnoses
- Follow-up scheduling

### 💊 **Remedy Templates**
- Spiritual practices (Meditation routines)
- Ayurvedic treatments (Detox programs)
- Yoga therapy sequences
- Energy healing programs

### 🔔 **Notifications**
- Appointment reminders
- System notifications
- Real-time updates

### 📊 **Audit Logging**
- Complete activity tracking
- User action logs
- System event records

## 🎯 Key Features

### ✅ **Authentication**
- Email/Password login
- Google Sign-In integration
- Role-based access control
- Session management with NextAuth

### ✅ **QR Code System**
- Camera-based QR scanning
- Manual check-in option
- Automatic appointment processing
- Queue management

### ✅ **Real-time Updates**
- Socket.io integration
- Live queue status
- Instant notifications
- Real-time dashboard updates

### ✅ **Multi-language Support**
- English, Hindi, Marathi
- RTL support
- Localized content

## 🔒 Security Features

- Rate limiting on API endpoints
- Input validation with Zod schemas
- SQL injection prevention
- XSS protection
- CSRF protection
- Secure password hashing (bcrypt)

## 📱 Mobile Responsiveness

- Progressive Web App (PWA) support
- Mobile-first design
- Touch-friendly interface
- Offline functionality

## 🚨 Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
sudo service postgresql status

# Reset database if corrupted
npm run db:reset
```

### Environment Variables
Make sure all required environment variables are set in your `.env` file.

### Google Sign-In Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

## 🛠️ Development Notes

- The seed script creates realistic test data
- All passwords are hashed using bcrypt
- QR codes are generated for each appointment
- Mock QR scanner data is used for development
- Rate limiting is implemented for security

## 📈 Next Steps

1. **Set up production database** - Configure PostgreSQL for production
2. **Configure email service** - Set up Resend or similar for email notifications
3. **SMS integration** - Configure Twilio for SMS notifications
4. **SSL certificates** - Set up HTTPS for production
5. **Monitoring** - Configure Sentry for error tracking

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the application logs
3. Contact the development team

---

**🎉 You're all set! Your Ashram Management System is ready to use.**