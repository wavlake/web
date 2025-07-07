# Layout System Guide

## GlobalLayout Architecture

Wavlake uses a smart GlobalLayout system that automatically manages headers, footers, and page layouts based on routes.

### How It Works

The `GlobalLayout` component wraps all routes and applies layouts automatically:

```typescript
"/" → No Layout (custom landing page)
"/welcome" → No Layout (custom onboarding)  
"/dashboard*" → Standard layout with header/footer
"/profile/*" → Standard layout with header/footer
"/group/*" → Full-width layout with header/footer
// All other routes → Standard layout with header/footer
```

### Key Components

- **GlobalLayout.tsx**: Smart wrapper with route-based logic
- **Layout.tsx**: Base layout component with header/footer
- **Header.tsx** (in ui/): Main navigation header
- **Footer.tsx**: Application footer

## Page Development Rules

### ✅ DO

```tsx
// Simple page component - let GlobalLayout handle layout
export default function MyPage() {
  return (
    <div className="my-6 space-y-6">
      <h1>My Page Content</h1>
      {/* Page content */}
    </div>
  );
}
```

### ❌ DON'T

```tsx
// Don't manually add headers/footers
export default function MyPage() {
  return (
    <div className="container mx-auto py-1 px-3 sm:px-4">
      <Header /> {/* Don't do this */}
      <main>
        <h1>My Page Content</h1>
      </main>
      <Footer /> {/* Don't do this */}
    </div>
  );
}
```

## Excluding Pages from Layout

To create pages with custom layouts:

1. Add route to `EXCLUDED_ROUTES` in `GlobalLayout.tsx`
2. Implement custom layout in the page component
3. Document the reasoning in code comments

## Standard Spacing

Always use consistent spacing classes:
- Container spacing: `my-6 space-y-6`
- This ensures visual consistency across all pages

## Technical Details

Route exclusion uses exact matching:
```typescript
const isExcluded = EXCLUDED_ROUTES.some(route => 
  location.pathname === route
);
```

This prevents issues like `/dashboard` being excluded when only `/` should be.