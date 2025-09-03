# Unified Loading System

This document describes the unified loading system used throughout the ShivGorakksha Ashram application.

## Components

### 1. TopProgressBar
- **Location**: `src/components/ui/top-progress-bar.tsx`
- **Purpose**: Shows navigation progress at the top of the page
- **Usage**: Automatically shows during route changes and React Query operations
- **Features**:
  - Smooth progress animation
  - Automatic visibility management
  - High z-index to stay on top

### 2. GlobalSpinner
- **Location**: `src/components/ui/global-spinner.tsx`
- **Purpose**: Unified spinner component for all loading states
- **Variants**:
  - `GlobalSpinner` - Base component with customizable size and message
  - `PageSpinner` - Full page loading with message
  - `CardSpinner` - Card-sized loading with message
  - `ButtonSpinner` - Small spinner for buttons
  - `FullScreenSpinner` - Full screen overlay with spinner

### 3. Skeleton Components
- **Location**: `src/components/ui/skeleton.tsx`
- **Purpose**: Content placeholders while loading
- **Components**:
  - `Skeleton` - Base skeleton component
  - `SkeletonCard` - Card layout placeholder
  - `SkeletonAvatar` - Avatar placeholder
  - `SkeletonButton` - Button placeholder
  - `SkeletonInput` - Input field placeholder
  - `SkeletonText` - Text content placeholder
  - `SkeletonTable` - Table layout placeholder
  - `SkeletonList` - List layout placeholder
  - `SkeletonDashboard` - Complete dashboard layout placeholder

## Usage Examples

### TopProgressBar (Automatic)
```tsx
// Automatically shows on navigation
// No manual implementation needed
```

### GlobalSpinner Components
```tsx
import { 
  GlobalSpinner, 
  PageSpinner, 
  CardSpinner, 
  ButtonSpinner,
  FullScreenSpinner 
} from "@/components/ui/global-spinner";

// Basic spinner
<GlobalSpinner size="md" />

// Page loading
<PageSpinner message="Loading dashboard..." />

// Card loading
<CardSpinner message="Loading data..." />

// Button loading
<Button>
  {isLoading && <ButtonSpinner />}
  Save
</Button>

// Full screen loading
<FullScreenSpinner message="Processing..." />
```

### Skeleton Components
```tsx
import { 
  Skeleton, 
  SkeletonCard, 
  SkeletonDashboard,
  SkeletonList 
} from "@/components/ui/skeleton";

// Basic skeleton
<Skeleton className="h-20 w-full" />

// Card skeleton
<SkeletonCard />

// Dashboard skeleton
<SkeletonDashboard />

// List skeleton
<SkeletonList items={5} />
```

## Migration Guide

### Before (Old Pattern)
```tsx
// ❌ Old way - multiple spinner implementations
if (isLoading) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

// ❌ Old way - inline Loader2
<Button>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Save
</Button>
```

### After (New Pattern)
```tsx
// ✅ New way - unified components
if (isLoading) {
  return <CardSpinner message="Loading..." />;
}

// ✅ New way - unified button spinner
<Button>
  {isLoading && <ButtonSpinner />}
  Save
</Button>
```

## Benefits

- ✅ **Consistent loading experience** across the app
- ✅ **Better UX** with appropriate loading indicators
- ✅ **Reduced bundle size** by eliminating duplicate loaders
- ✅ **Maintainable code** with centralized loading components
- ✅ **Accessible** with proper ARIA labels and keyboard support

## Best Practices

1. **Use appropriate spinner size**:
   - `sm` (16px) - Buttons, inline elements
   - `md` (24px) - Cards, forms
   - `lg` (32px) - Pages, sections
   - `xl` (48px) - Full screen loading

2. **Provide meaningful messages**:
   - Be specific about what's loading
   - Use action-oriented language
   - Keep messages concise

3. **Choose the right component**:
   - `PageSpinner` - Full page loading
   - `CardSpinner` - Section/card loading
   - `ButtonSpinner` - Button state loading
   - `Skeleton` - Content structure loading

4. **Avoid multiple spinners**:
   - Don't show multiple spinners simultaneously
   - Use skeleton loading for content structure
   - Use progress bars for long operations

## Implementation Status

- ✅ TopProgressBar - Implemented and working
- ✅ GlobalSpinner - Implemented with all variants
- ✅ Skeleton Components - Implemented with comprehensive options
- 🔄 Migration - In progress (updating existing pages)
- ⏳ Documentation - Complete

The system now provides a complete loading experience:
- **Navigation**: TopProgressBar for route changes
- **Content**: Skeleton components for structure
- **Actions**: GlobalSpinner variants for different contexts
