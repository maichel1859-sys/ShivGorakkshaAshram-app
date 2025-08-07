# 🏗️ Aashram App Architecture

## 📋 Overview

This application follows **modern Next.js App Router architecture** with clear separation of concerns, React Server Components by default, and proper state management patterns.

## 🎯 Core Principles

### ✅ **React Server Components (RSC) First**
- **Default**: All components are Server Components unless they need client-side interactivity
- **Client Components**: Only use `"use client"` when absolutely necessary (forms, interactivity, browser APIs)
- **Data Fetching**: Server Components use native `fetch()` or Server Actions directly
- **Performance**: Reduces JavaScript bundle size and improves initial page load

### ⚙️ **Server Actions for Mutations**
- **All mutations** use Next.js Server Actions (no API routes for mutations)
- **Form handling** with `useFormState` and `useFormStatus` for optimal UX
- **Error handling** with proper error boundaries and optimistic updates
- **Type safety** with Zod validation schemas

### ⚡ **Data Fetching Strategy**
- **Server Components**: Use native `fetch()` or Server Actions directly
- **Client Components**: Use React Query for remote data that needs caching, refetching, or real-time updates
- **Avoid hydration**: Push data fetching to the server when possible
- **Caching**: React Query handles client-side caching, Server Components handle server-side caching

### 📦 **State Management**
- **Zustand**: Only for UI state (modals, drawers, toggles, lightweight shared state)
- **React Query**: For remote state/data (lists, pagination, filters, infinite scroll, caching)
- **Local State**: Use `useState` for component-specific state
- **Form State**: Use `useFormState` for Server Action forms

## 🗂️ Folder Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/        # Route groups
│   ├── api/               # API routes (minimal, only for external integrations)
│   └── globals.css        # Global styles
├── components/            # Reusable components
│   ├── client/           # Client Components (use "use client")
│   ├── server/           # Server Components (default)
│   └── ui/               # UI components (shadcn/ui)
├── hooks/                # Custom hooks
│   ├── queries/          # React Query hooks for remote data
│   └── use-server-action.ts # Server Action utilities
├── lib/                  # Utility libraries
│   ├── actions/          # Server Actions
│   ├── database/         # Database utilities
│   ├── external/         # External service integrations
│   ├── repositories/     # Data access layer
│   ├── services/         # Business logic layer
│   ├── validation/       # Zod schemas
│   └── utils/            # Utility functions
├── store/                # Zustand stores (UI state only)
└── types/                # TypeScript type definitions
```

## 🔄 Data Flow

### Server Components (Default)
```
Server Component → Server Action → Database → Server Component → HTML
```

### Client Components (When Needed)
```
Client Component → React Query → Server Action → Database → Client Component → UI Update
```

### Form Handling
```
Form Component → useFormState → Server Action → Database → Optimistic Update → UI
```

## 🎨 Component Patterns

### Server Component Example
```tsx
// ✅ Good: Server Component with direct data fetching
async function UserProfile({ userId }: { userId: string }) {
  const user = await getUser(userId); // Server Action
  
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

### Client Component Example
```tsx
// ✅ Good: Client Component with React Query
"use client";

function UserList() {
  const { data: users, isLoading } = useUsers(); // React Query hook
  
  if (isLoading) return <Skeleton />;
  
  return (
    <div>
      {users?.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
```

### Form with Server Actions
```tsx
// ✅ Good: Form with useFormState
"use client";

function CreateUserForm() {
  const [state, formAction] = useFormState(createUser, null);
  
  return (
    <form action={formAction}>
      <input name="name" required />
      <input name="email" type="email" required />
      <button type="submit">Create User</button>
    </form>
  );
}
```

## 🗃️ State Management Patterns

### Zustand (UI State Only)
```tsx
// ✅ Good: UI state only
const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  modals: {},
  theme: 'system',
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
```

### React Query (Remote Data)
```tsx
// ✅ Good: Remote data with caching
export function useUsers(filters?: UserFilters) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => getUsers(filters),
    staleTime: 5 * 60 * 1000,
  });
}
```

## 🔧 Server Actions Pattern

### Action Structure
```tsx
// ✅ Good: Proper Server Action structure
export async function createUser(formData: FormData) {
  try {
    // 1. Validate input
    const data = userSchema.parse(Object.fromEntries(formData));
    
    // 2. Business logic
    const user = await userService.createUser(data);
    
    // 3. Return result
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### Error Handling
```tsx
// ✅ Good: Proper error handling
export async function updateUser(formData: FormData) {
  try {
    const data = userSchema.parse(Object.fromEntries(formData));
    const user = await userService.updateUser(data);
    return { success: true, data: user };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', details: error.errors };
    }
    return { success: false, error: 'Internal server error' };
  }
}
```

## 🚀 Performance Optimizations

### 1. **Server Components**
- Reduce client-side JavaScript
- Faster initial page loads
- Better SEO

### 2. **React Query**
- Intelligent caching
- Background refetching
- Optimistic updates

### 3. **Code Splitting**
- Route-based splitting (automatic with App Router)
- Component-based splitting for large components

### 4. **Image Optimization**
- Next.js Image component
- Automatic WebP conversion
- Responsive images

## 🔒 Security Patterns

### 1. **Server Actions**
- All mutations go through Server Actions
- Server-side validation with Zod
- Proper error handling

### 2. **Authentication**
- NextAuth.js integration
- Server-side session validation
- Role-based access control

### 3. **Input Validation**
- Zod schemas for all inputs
- Server-side validation
- Type-safe data handling

## 📊 Monitoring & Analytics

### 1. **Error Tracking**
- Sentry integration
- Server-side error logging
- Client-side error boundaries

### 2. **Performance Monitoring**
- Web Vitals tracking
- Custom performance metrics
- Real User Monitoring (RUM)

## 🧪 Testing Strategy

### 1. **Unit Tests**
- Server Actions
- Utility functions
- Business logic

### 2. **Integration Tests**
- Database operations
- External service integrations
- API endpoints

### 3. **E2E Tests**
- Critical user flows
- Form submissions
- Navigation

## 📈 Scalability Considerations

### 1. **Database**
- Proper indexing
- Connection pooling
- Query optimization

### 2. **Caching**
- React Query for client-side
- Redis for server-side
- CDN for static assets

### 3. **Code Organization**
- Feature-based structure
- Clear separation of concerns
- Reusable components

## 🎯 Best Practices

### ✅ **Do**
- Use Server Components by default
- Use Server Actions for mutations
- Use React Query for client-side data fetching
- Use Zustand only for UI state
- Validate all inputs with Zod
- Handle errors gracefully
- Write type-safe code

### ❌ **Don't**
- Don't use API routes for mutations
- Don't put remote data in Zustand
- Don't use client components unnecessarily
- Don't skip input validation
- Don't ignore error handling
- Don't mix concerns in components

## 🔄 Migration Guide

### From API Routes to Server Actions
1. Move mutation logic to Server Actions
2. Update forms to use `useFormState`
3. Remove API route files
4. Update client-side code to use Server Actions

### From Redux to Zustand + React Query
1. Move UI state to Zustand
2. Move remote data to React Query
3. Remove Redux dependencies
4. Update components to use new patterns

This architecture ensures a modern, performant, and maintainable application that follows Next.js best practices and provides an excellent developer experience.