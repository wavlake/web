# Wavlake Brand Guidelines

> **Version**: 1.0  
> **Date**: July 2025  
> **Purpose**: Comprehensive brand guidelines for product customization and marketing materials

## Table of Contents

1. [Brand Colors](#brand-colors)
2. [Typography](#typography)
3. [Logos & Icons](#logos--icons)
4. [Company Information](#company-information)
5. [Usage Guidelines](#usage-guidelines)
6. [File Structure](#file-structure)

---

## Brand Colors

### Primary Brand Colors

These are the core colors that define Wavlake's visual identity:

| Color Name       | Hex Code  | RGB                | Usage                                    |
| ---------------- | --------- | ------------------ | ---------------------------------------- |
| **Brand Pink**   | `#f3aef2` | rgb(243, 174, 242) | Primary brand color, buttons, highlights |
| **Brand Purple** | `#ba9bf9` | rgb(186, 155, 249) | Secondary brand color, accents           |
| **Brand Orange** | `#ffb848` | rgb(255, 184, 72)  | Call-to-action, energy elements          |
| **Brand Mint**   | `#96f9d4` | rgb(150, 249, 212) | Success states, positive indicators      |

### Supporting Colors

Additional colors for UI elements and states:

| Color Name          | Hex Code  | RGB                | Usage                             |
| ------------------- | --------- | ------------------ | --------------------------------- |
| **Brand Black**     | `#171817` | rgb(23, 24, 23)    | Primary text, dark backgrounds    |
| **Brand Beige**     | `#fff6f1` | rgb(255, 246, 241) | Light backgrounds, cards          |
| **Brand Highlight** | `#fffff2` | rgb(255, 255, 242) | Emphasis, highlights              |
| **Brand Down**      | `#ff4949` | rgb(255, 73, 73)   | Error states, negative indicators |

### Color Variations

Some colors have light and dark variations:

- **Brand Pink**
  - Light: `#ffeeff` rgb(255, 238, 255)
  - Dark: `#b36eb2` rgb(179, 110, 178)
- **Brand Beige**
  - Dark: `#CCC3BE` rgb(204, 195, 190)
- **Brand Black**
  - Light: `#7d7e7d` rgb(125, 126, 125)

### CSS Implementation

```css
/* Tailwind CSS Custom Colors */
:root {
  --brand-pink: #f3aef2;
  --brand-purple: #ba9bf9;
  --brand-orange: #ffb848;
  --brand-mint: #96f9d4;
  --brand-black: #171817;
  --brand-beige: #fff6f1;
  --brand-highlight: #fffff2;
  --brand-down: #ff4949;
}
```

---

## Typography

### Primary Font

- **Font Family**: Poppins
- **Fallback**: 'Helvetica', system-ui, sans-serif
- **Weight**: Multiple weights available (300, 400, 500, 600, 700)
- **Character**: Modern, clean, approachable

### Font Usage Guidelines

- **Headers**: Use Poppins 600-700 weight
- **Body Text**: Use Poppins 400 weight
- **Buttons**: Use Poppins 500-600 weight
- **Captions**: Use Poppins 400 weight

### CSS Implementation

```css
body {
  font-family: "Poppins", system-ui, sans-serif;
  background-color: #000000;
}
```

---

## Logos & Icons

### Main Logo Files

Located in `/logos/` directory:

#### Primary Logos

- `wavlake-icon-96.png` - 96×96px
- `wavlake-icon-128.png` - 128×128px
- `wavlake-icon-192.png` - 192×192px
- `wavlake-icon-256.png` - 256×256px
- `wavlake-icon-384.png` - 384×384px
- `wavlake-icon-512.png` - 512×512px

#### Header Icons

- `wavlake-md-header-icon.png` - Medium header size
- `wavlake-sm-header-icon.png` - Small header size

#### Favicon Set

- `favicon-16x16.png` - 16×16px
- `favicon-32x32.png` - 32×32px
- `apple-touch-icon.png` - 180×180px
- `android-chrome-192x192.png` - 192×192px
- `android-chrome-512x512.png` - 512×512px
- `mstile-150x150.png` - 150×150px (Microsoft tiles)

### Main Vector Logo

Located in `/logos/` directory:

#### Core Brand Elements

- `LOGO.svg` - Main vector logo (primary brand asset)

---

## Company Information

### Brand Identity

- **Company Name**: Wavlake
- **Tagline**: "Play, boost, and more on Wavlake ⚡️🎵"
- **Domain**: wavlake.com
- **Social**: @wavlake

### Brand Voice

- **Tone**: Energetic, innovative, community-focused
- **Voice**: Modern, approachable, tech-savvy
- **Personality**: Lightning-fast, music-loving, Bitcoin-native

### Key Messages

- Bitcoin-native music platform
- Lightning Network integration
- Artist empowerment through direct payments
- Community-driven music discovery
- Value-for-value (v4v) philosophy

---

## Usage Guidelines

### Logo Usage

1. **Minimum Size**: 32×32px for digital use
2. **Clear Space**: Maintain clear space equal to 1/2 the logo height around all sides
3. **Backgrounds**:
   - Use on dark backgrounds: Light versions
   - Use on light backgrounds: Dark versions
4. **Modifications**: Do not stretch, rotate, or modify logo proportions

### Color Usage

1. **Primary Colors**: Use brand pink as the primary color for key actions
2. **Contrast**: Ensure sufficient contrast ratios for accessibility
3. **Consistency**: Use consistent color combinations across all materials
4. **Accessibility**: All text must meet WCAG AA contrast requirements

### Typography Guidelines

1. **Hierarchy**: Establish clear typographic hierarchy
2. **Readability**: Ensure text is legible at all sizes
3. **Consistency**: Use consistent spacing and sizing
4. **Web Safety**: Always include fallback fonts

---

## File Structure

```
branding-package/
├── WAVLAKE_BRAND_GUIDELINES.md (this file)
├── README.md
├── colors/
│   └── brand-colors.css
└── logos/
    ├── LOGO.svg (main vector logo)
    ├── wavlake-icon-*.png (various sizes: 96, 128, 192, 256, 384, 512)
    ├── wavlake-md-header-icon.png
    ├── wavlake-sm-header-icon.png
    ├── favicon-*.png (16x16, 32x32)
    ├── android-chrome-*.png (192x192, 512x512)
    ├── apple-touch-icon.png
    └── mstile-150x150.png
```

---

## Technical Implementation

### CSS Variables

```css
:root {
  /* Brand Colors */
  --brand-pink: #f3aef2;
  --brand-pink-light: #ffeeff;
  --brand-pink-dark: #b36eb2;
  --brand-purple: #ba9bf9;
  --brand-beige: #fff6f1;
  --brand-beige-dark: #ccc3be;
  --brand-black: #171817;
  --brand-black-light: #7d7e7d;
  --brand-highlight: #fffff2;
  --brand-down: #ff4949;
  --brand-up: #5bdeb1;
  --brand-orange: #ffb848;
  --brand-mint: #96f9d4;
}
```

### Tailwind Configuration

```javascript
colors: {
  'brand-pink': {
    DEFAULT: '#f3aef2',
    light: '#ffeeff',
    dark: '#b36eb2',
  },
  'brand-purple': {
    DEFAULT: '#ba9bf9',
  },
  'brand-orange': {
    DEFAULT: '#ffb848',
  },
  'brand-mint': {
    DEFAULT: '#96f9d4',
  },
  // ... additional colors
}
```

---

## Contact Information

For questions about brand usage or additional assets:

- **Website**: wavlake.com
- **Social**: @wavlake
- **Repository**: github.com/wavlake/wavlake.com
- **Graphics Repository**: github.com/wavlake/graphics

---

_This document serves as the comprehensive brand guidelines for Wavlake. All assets and guidelines should be followed to maintain brand consistency across all platforms and materials._
