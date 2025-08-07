# Server Actions Migration Guide

This document outlines the complete migration from API routes to Server Actions and React Server Components (RSC) for the Aashram Management System.

## Overview

We have successfully converted all API routes to server actions, implementing a modern Next.js 14+ architecture with:

- **Server Actions**: Replacing API routes for data mutations
- **React Server Components**: For server-side data fetching and rendering
- **Parallel Routes**: For modal dialogs and complex layouts
- **Intercepting Routes**: For seamless user experiences

## Migration Summary

### ✅ Completed Conversions

#### 1. **Admin Actions** (`/lib/actions/admin-actions.ts`)
- User management (CRUD operations)
- Dashboard statistics
- System alerts and monitoring
- Audit logging

#### 2. **Appointment Actions** (`/lib/actions/appointment-actions.ts`)
- Appointment booking and management
- Availability checking
- Status updates
- QR code generation

#### 3. **Authentication Actions** (`/lib/actions/auth-actions.ts`)
- Phone OTP authentication
- User registration
- Family contact management
- Password changes

#### 4. **Check-in Actions** (`/lib/actions/checkin-actions.ts`)
- QR code check-in
- Manual check-in
- Check-in history and statistics

#### 5. **Consultation Actions** (`/lib/actions/consultation-actions.ts`)
- Consultation management
- Session tracking
- Statistics and reporting

#### 6. **Dashboard Actions** (`/lib/actions/dashboard-actions.ts`)
- Role-specific dashboards (Admin, Coordinator, Guruji)
- Usage reports
- System health monitoring

#### 7. **Notification Actions** (`/lib/actions/notification-actions.ts`)
- Notification management
- Bulk notifications
- Read/unread status

#### 8. **Queue Actions** (`/lib/actions/queue-actions.ts`)
- Queue management
- Position tracking
- Real-time updates

#### 9. **Remedy Actions** (`/lib/actions/remedy-actions.ts`)
- Remedy templates
- Prescription management
- User remedies

#### 10. **Settings Actions** (`/lib/actions/settings-actions.ts`)
- System settings
- User preferences
- Privacy controls

#### 11. **System Actions** (`/lib/actions/system-actions.ts`)
- Health checks
- Metrics collection
- API documentation
- Cache management

## Architecture Benefits

### 1. **Performance Improvements**
- **Reduced Client-Server Round Trips**: Server actions execute directly on the server
- **Automatic Optimistic Updates**: Built-in revalidation and cache management
- **Streaming**: Progressive loading with Suspense boundaries

### 2. **Developer Experience**
- **Type Safety**: Full TypeScript support across server and client
- **Simplified Data Flow**: No need for API route handlers
- **Built-in Error Handling**: Consistent error patterns
- **Form Integration**: Native form handling with progressive enhancement

### 3. **Security Enhancements**
- **Server-Side Validation**: All validation happens on the server
- **Automatic CSRF Protection**: Built into server actions
- **Reduced Attack Surface**: No exposed API endpoints

## Implementation Patterns

### 1. **Server Actions Pattern**

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function createUser(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    // Validation and business logic
    const user = await prisma.user.create({
      data: { /* user data */ }
    });

    // Revalidate related pages
    revalidatePath('/admin/users');
    
    return { success: true, user };
  } catch (error) {
    return { success: false, error: 'Failed to create user' };
  }
}
```

### 2. **React Server Components Pattern**

```typescript
// Server Component
async function UserListServer({ searchParams }: { searchParams: any }) {
  const result = await getUsers(searchParams);
  
  if (!result.success) {
    return <Alert>Failed to load users: {result.error}</Alert>;
  }

  return <UserList users={result.users} />;
}

// Page Component
export default function UsersPage({ searchParams }: { searchParams: any }) {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <UserListServer searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
```

### 3. **Parallel Routes Pattern**

```typescript
// Layout with parallel routes
export default async function AdminLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <div>
      {children}
      {modal} {/* Parallel route for modals */}
    </div>
  );
}
```

### 4. **Intercepting Routes Pattern**

```typescript
// @modal/(.)users/create/page.tsx
export default function CreateUserModal() {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <Card>
        <form action={createUser}>
          {/* Form fields */}
        </form>
      </Card>
    </div>
  );
}
```

## File Structure

```
src/
├── lib/
│   └── actions/
│       ├── index.ts                 # Export all actions
│       ├── admin-actions.ts         # Admin functionality
│       ├── appointment-actions.ts   # Appointment management
│       ├── auth-actions.ts          # Authentication
│       ├── checkin-actions.ts       # Check-in system
│       ├── consultation-actions.ts  # Consultation management
│       ├── dashboard-actions.ts     # Dashboard data
│       ├── notification-actions.ts  # Notifications
│       ├── queue-actions.ts         # Queue management
│       ├── remedy-actions.ts        # Remedy system
│       ├── settings-actions.ts      # Settings management
│       ├── system-actions.ts        # System utilities
│       └── user-actions.ts          # User management
├── app/
│   └── (dashboard)/
│       └── admin/
│           ├── @modal/              # Parallel route for modals
│           │   ├── default.tsx      # Default modal state
│           │   └── (.)users/
│           │       └── create/
│           │           └── page.tsx # Intercepting route
│           ├── layout.tsx           # Layout with parallel routes
│           ├── page.tsx             # Main dashboard
│           └── users/
│               └── page.tsx         # User management
└── components/
    ├── forms/
    │   └── user-settings-form.tsx   # Form components
    └── family-contacts-list.tsx     # List components
```

## Usage Examples

### 1. **Using Server Actions in Forms**

```typescript
'use client';

import { createUser } from '@/lib/actions';

export function CreateUserForm() {
  async function handleSubmit(formData: FormData) {
    const result = await createUser(formData);
    
    if (result.success) {
      // Handle success
    } else {
      // Handle error
    }
  }

  return (
    <form action={handleSubmit}>
      <input name="name" required />
      <input name="email" type="email" required />
      <button type="submit">Create User</button>
    </form>
  );
}
```

### 2. **Server-Side Data Fetching**

```typescript
// Server Component
async function DashboardStats() {
  const stats = await getAdminDashboardStats();
  
  if (!stats.success) {
    return <div>Error loading stats</div>;
  }

  return (
    <div>
      <h2>Total Users: {stats.data.totalUsers}</h2>
      <h2>Active Appointments: {stats.data.activeAppointments}</h2>
    </div>
  );
}
```

### 3. **Parallel Routes with Modals**

```typescript
// Navigate to modal
<Link href="/admin/users/create">Create User</Link>

// Modal opens in parallel route
// URL: /admin/users/create
// Modal: /admin/@modal/(.)users/create/page.tsx
```

## Migration Checklist

### ✅ Completed
- [x] Convert all API routes to server actions
- [x] Implement React Server Components for data fetching
- [x] Set up parallel routes for modals
- [x] Create intercepting routes for seamless UX
- [x] Implement proper error handling
- [x] Add loading states with Suspense
- [x] Set up revalidation patterns
- [x] Create reusable form components
- [x] Implement proper TypeScript types
- [x] Add comprehensive documentation

### 🔄 Next Steps
- [ ] Remove old API routes
- [ ] Update client-side code to use server actions
- [ ] Add comprehensive testing
- [ ] Performance optimization
- [ ] Error boundary implementation
- [ ] Monitoring and logging

## Best Practices

### 1. **Error Handling**
- Always return consistent error objects
- Use proper HTTP status codes
- Implement proper logging
- Provide user-friendly error messages

### 2. **Performance**
- Use Suspense boundaries for loading states
- Implement proper caching strategies
- Optimize database queries
- Use streaming for large datasets

### 3. **Security**
- Validate all inputs on the server
- Implement proper authentication checks
- Use CSRF protection
- Sanitize user inputs

### 4. **Type Safety**
- Use TypeScript for all server actions
- Define proper interfaces for data structures
- Use Zod for runtime validation
- Maintain consistent return types

## Troubleshooting

### Common Issues

1. **"use server" directive missing**
   - Ensure all server actions have `'use server';` at the top

2. **Form data not being received**
   - Check that form fields have proper `name` attributes
   - Ensure form has `action` attribute pointing to server action

3. **Revalidation not working**
   - Use `revalidatePath()` after mutations
   - Check that paths are correct

4. **TypeScript errors**
   - Ensure proper type definitions
   - Check import/export statements
   - Verify Zod schema definitions

## Conclusion

The migration to server actions provides significant benefits in terms of performance, developer experience, and security. The new architecture is more maintainable, type-safe, and follows modern Next.js best practices.

For questions or issues, refer to the Next.js documentation on Server Actions and React Server Components. 