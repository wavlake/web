# Wavlake Branding Package

This directory contains all the branding assets and guidelines for Wavlake, organized for easy access and implementation.

## 🎨 Quick Reference

### Primary Colors

- **Brand Pink**: `#f3aef2` - Primary brand color
- **Brand Purple**: `#ba9bf9` - Secondary brand color
- **Brand Orange**: `#ffb848` - Call-to-action color
- **Brand Mint**: `#96f9d4` - Success/positive color

### Typography

- **Primary Font**: Poppins
- **Fallback**: 'Helvetica', system-ui, sans-serif

### Key Assets

- Main Logo: `logos/LOGO.svg`
- Logo Variations: `logos/wavlake-icon-[size].png`
- Header Icons: `logos/wavlake-md-header-icon.png`, `logos/wavlake-sm-header-icon.png`

## 📁 Directory Structure

```
branding-package/
├── README.md                          # This file
├── WAVLAKE_BRAND_GUIDELINES.md        # Comprehensive brand guidelines
├── colors/                            # Color definitions
│   └── brand-colors.css               # CSS color variables and classes
└── logos/                             # Logo files in various sizes
    ├── LOGO.svg                       # Main vector logo
    ├── wavlake-icon-96.png
    ├── wavlake-icon-128.png
    ├── wavlake-icon-192.png
    ├── wavlake-icon-256.png
    ├── wavlake-icon-384.png
    ├── wavlake-icon-512.png
    ├── wavlake-md-header-icon.png
    ├── wavlake-sm-header-icon.png
    ├── favicon-16x16.png
    ├── favicon-32x32.png
    ├── apple-touch-icon.png
    ├── android-chrome-192x192.png
    ├── android-chrome-512x512.png
    └── mstile-150x150.png
```

## 🚀 For Ramp Customization

### Essential Files for Integration

1. **Colors**: Use `colors/brand-colors.css` for all color definitions
2. **Logo**: Use `logos/LOGO.svg` for vector logo or `logos/wavlake-icon-256.png` for raster
3. **Header Icons**: Use `logos/wavlake-md-header-icon.png` or `logos/wavlake-sm-header-icon.png`
4. **Typography**: Implement Poppins font family

### Quick Implementation

```css
/* Import brand colors */
@import "./colors/brand-colors.css";

/* Apply brand styles */
.primary-button {
  background-color: var(--brand-pink);
  color: var(--brand-black);
  font-family: "Poppins", sans-serif;
}
```

## 📋 Usage Guidelines

### Logo Usage

- **Minimum Size**: 32×32px for digital use
- **Clear Space**: Maintain clear space equal to 1/2 the logo height
- **Backgrounds**: Use appropriate contrast versions

### Color Usage

- **Primary Actions**: Use brand pink (`#f3aef2`)
- **Secondary Actions**: Use brand purple (`#ba9bf9`)
- **Success States**: Use brand mint (`#96f9d4`)
- **Error States**: Use brand down (`#ff4949`)

### Typography

- **Headers**: Poppins 600-700 weight
- **Body Text**: Poppins 400 weight
- **Buttons**: Poppins 500-600 weight

## 📞 Contact

For questions about brand usage or additional assets:

- **Website**: wavlake.com
- **Social**: @wavlake
- **Main Repository**: github.com/wavlake/wavlake.com
- **Graphics Repository**: github.com/wavlake/graphics

## 📄 License

These brand assets are proprietary to Wavlake and should only be used with proper authorization for official Wavlake integrations and partnerships.

---

_Generated: July 2025 | Version: 1.0_
