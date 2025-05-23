# Chorus Project Error Report

## Summary

The project builds successfully (`npm run ci` passes), but there are several issues that need attention:

## 1. Security Vulnerabilities (2 moderate)

**Issue**: Vulnerable versions of `esbuild` dependency
- **Severity**: Moderate
- **Details**: esbuild <=0.24.2 enables any website to send requests to the development server
- **Fix**: Run `npm audit fix --force` (will upgrade to vite@6.3.5, which is a breaking change)

## 2. ESLint Errors (8 errors, 25 warnings)

### Critical React Hook Violations:

1. **CreatePostForm.tsx:91** - `useAuthor` called conditionally
   - Hook is called after an early return (`if (!user) return null;`)
   - **Fix**: Move the hook call before the conditional return

2. **ReplyForm.tsx:100** - `useAuthor` called conditionally
   - Same issue as above
   - **Fix**: Move the hook call before the conditional return

3. **PostList.tsx:763-764** - Hooks called inside callback function
   - `useNostr` and `useQuery` are called inside a nested function
   - **Fix**: These hooks need to be called at the top level of the component

### TypeScript Issues:

4. **Multiple files** - Using `any` type (5 occurrences)
   - GroupNutzapList.tsx:88
   - NutzapButton.tsx:119
   - NutzapList.tsx:21
   - PostList.tsx:830
   - **Fix**: Replace `any` with proper type definitions

### Fast Refresh Warnings:

5. **Multiple UI component files** - Exporting non-component values
   - JoinDialogContext.tsx:105
   - badge.tsx:36
   - button.tsx:56
   - **Fix**: Move constants/functions to separate files or use separate exports

## 3. Performance Issues

### Large Bundle Size:
- Main JS bundle: 1,457.33 kB (425.18 kB gzipped)
- **Warning**: Chunks larger than 500 kB after minification
- **Recommendations**:
  - Implement code splitting with dynamic imports
  - Use manual chunks in Vite configuration
  - Lazy load heavy components

## 4. Missing Dependency in useEffect:

- **NutzapCard.tsx:250** - Missing `formatAmount` dependency
- **Fix**: Add `formatAmount` to the dependency array or remove if not needed

## 5. Project Configuration Issues

### Package.json naming:
- Project name is "mkstack" but appears to be a Nostr client called "Chorus"
- Consider updating the package name for clarity

## Recommendations

### Immediate Actions:
1. Fix React Hook violations - these can cause runtime errors
2. Replace `any` types with proper TypeScript types
3. Move hook calls before conditional returns

### Short-term:
1. Address security vulnerabilities (may require testing after Vite upgrade)
2. Implement code splitting to reduce bundle size
3. Fix ESLint warnings for better code quality

### Long-term:
1. Set up pre-commit hooks to catch these issues early
2. Configure stricter TypeScript settings
3. Add unit tests for critical components

## Commands to Fix Issues

```bash
# Fix security vulnerabilities (test thoroughly after upgrade)
npm audit fix --force

# Run linter to see all issues
npm run lint

# Fix auto-fixable issues
npx eslint . --fix
```

## Files Requiring Manual Fixes

1. `/src/components/groups/CreatePostForm.tsx`
2. `/src/components/groups/ReplyForm.tsx`
3. `/src/components/groups/PostList.tsx`
4. `/src/components/cashu/NutzapCard.tsx`
5. All files with `any` type usage