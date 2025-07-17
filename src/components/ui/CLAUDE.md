# UI Components Guide

This directory contains the **shadcn/ui component system** used throughout Wavlake. All components are built with Radix UI primitives and styled with Tailwind CSS for consistency, accessibility, and maintainability.

## Architecture Overview

### Component Philosophy
The UI component system follows these principles:
- **Accessibility First**: Built on Radix UI primitives for WCAG compliance
- **Consistent Design**: Unified design tokens and styling patterns
- **Composable**: Components work together seamlessly
- **Customizable**: Easy theming and variant support
- **Type Safe**: Full TypeScript implementation

### Component Pattern
All components follow a consistent architecture:
- Use React's `forwardRef` for ref forwarding and component composition
- Use the `cn()` utility for intelligent class name merging
- Built on Radix UI primitives for robust accessibility
- Styled with Tailwind CSS classes following design system
- Support variant props for different visual styles
- Include proper TypeScript interfaces and documentation

## Available Components

### Layout & Structure
- **Card**: Container with header, content, and footer sections
- **Separator**: Visual divider between content
- **AspectRatio**: Maintains consistent width-to-height ratio
- **ScrollArea**: Scrollable container with custom scrollbars

### Navigation
- **NavigationMenu**: Accessible navigation component
- **Tabs**: Tabbed interface component
- **Breadcrumb**: Shows current location in hierarchy
- **Pagination**: Controls for navigating between pages
- **Sidebar**: Navigation sidebar component

### Forms & Inputs
- **Form**: Form validation and submission handling
- **Input**: Text input field
- **Textarea**: Multi-line text input
- **Select**: Dropdown selection component
- **Checkbox**: Selectable input element
- **RadioGroup**: Group of radio inputs
- **Switch**: Toggle switch control
- **Slider**: Input for selecting value from range
- **InputOTP**: One-time password input field
- **Calendar**: Date picker component

### Feedback & Overlays
- **Dialog**: Modal window overlay
- **AlertDialog**: Modal for critical actions requiring confirmation
- **Sheet**: Side-anchored dialog component
- **Drawer**: Side-sliding panel
- **Popover**: Floating content triggered by button
- **Tooltip**: Informational text on hover
- **Toast**: Toast notification component
- **Alert**: Displays important messages
- **Progress**: Progress indicator

### Data Display
- **Table**: Data table with headers and rows
- **Avatar**: User profile pictures with fallback
- **Badge**: Small status descriptors
- **Skeleton**: Loading placeholder

### Interactive Elements
- **Button**: Customizable with multiple variants and sizes
- **Toggle**: Two-state button
- **ToggleGroup**: Group of toggle buttons
- **Accordion**: Vertically collapsing content panels
- **Collapsible**: Toggle for showing/hiding content
- **HoverCard**: Card that appears on hover
- **ContextMenu**: Right-click menu component
- **DropdownMenu**: Menu from trigger element
- **Command**: Command palette for keyboard-first interfaces
- **Menubar**: Horizontal menu with dropdowns

### Media & Visualization
- **Carousel**: Slideshow for cycling through elements
- **Chart**: Data visualization component
- **Resizable**: Resizable panels and interfaces

## Usage Patterns

### Basic Component Usage
```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function BasicExample() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Example Card</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="outline">Click me</Button>
      </CardContent>
    </Card>
  )
}
```

### Advanced Form Example
```tsx
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

export function FormExample() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Login Form</CardTitle>
      </CardHeader>
      <CardContent>
        <Form>
          <FormField name="email">
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Enter your email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
          <Button type="submit" className="w-full">
            Sign In
          </Button>
        </Form>
      </CardContent>
    </Card>
  )
}
```

### Component Composition
```tsx
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Toast } from "@/components/ui/toast"

export function CompositionExample() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Action</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end space-x-2">
          <Button variant="outline">Cancel</Button>
          <Button>Confirm</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

## Design System Integration

### Color Variants
- **default**: Primary brand colors
- **destructive**: Error/danger states  
- **outline**: Subtle borders
- **secondary**: Secondary actions
- **ghost**: Minimal styling
- **link**: Link appearance

### Size Variants
- **sm**: Small/compact
- **default**: Standard size
- **lg**: Large/prominent
- **icon**: Icon-only buttons

### Accessibility Features
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA attributes
- **Focus Management**: Visible focus indicators
- **Color Contrast**: WCAG AA compliance

## Best Practices

### Component Usage
- Always import from `@/components/ui/[component]`
- Use the `cn()` utility for conditional classes
- Prefer composition over customization
- Use proper TypeScript interfaces

### Styling Guidelines
- Use design system variants instead of custom CSS
- Maintain consistent spacing with Tailwind classes
- Follow the established color palette
- Ensure accessibility standards are met

### Performance Considerations
- Components are tree-shakeable by default
- Use `asChild` prop for composition without wrapper divs
- Lazy load heavy components when possible