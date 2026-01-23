# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Shopify Liquid theme based on Dawn v15.4.1 (Radiant). It's a pure Liquid theme with no build system - assets are served directly through Shopify's CDN.

## Development Commands

```bash
# Start local development server with hot reload
shopify theme dev

# Push changes to a theme on your store
shopify theme push

# Pull latest changes from a live theme
shopify theme pull

# Check theme for errors before deployment
shopify theme check
```

## Architecture

### Directory Structure
- `assets/` - CSS, JS, SVG icons (no bundling, files served directly)
- `config/` - Theme settings schema and current values
- `layout/` - Base layouts (theme.liquid wraps all pages)
- `sections/` - Full-width content blocks with schema definitions
- `snippets/` - Reusable partials (called via `{% render %}`)
- `templates/` - JSON files that compose sections for each page type
- `locales/` - Translation files (50+ languages)

### JavaScript Pattern
All JavaScript uses native Web Components (Custom Elements):

```javascript
class ComponentName extends HTMLElement {
  constructor() { super(); }
  connectedCallback() { /* initialize */ }
}
customElements.define('component-name', ComponentName);
```

Key files:
- `assets/global.js` - Core utilities and base classes
- `assets/pubsub.js` - Event pub/sub system for component communication
- `assets/constants.js` - Shared constants

### CSS Architecture
- Component-based files: `component-*.css`, `section-*.css`
- CSS variables defined in `layout/theme.liquid` for theming
- Color schemes applied via `.color-scheme--{name}` classes
- Mobile-first with breakpoints at 750px and 990px

### Section Schema
Every section ends with a `{% schema %}` JSON block defining:
- `name` - Display name in theme editor
- `settings` - Customization options
- `blocks` - Repeatable content types
- `presets` - Default configurations

### Snippet Parameters
Snippets receive data via `{% render 'snippet-name', param: value %}`. Common patterns:
- `card-product.liquid` - Takes `card_product`, `media_aspect_ratio`, `show_vendor`
- `product-variant-picker.liquid` - Takes `product`, `block`, `product_form_id`

### Template System
Templates are JSON files that reference sections by type:
```json
{
  "sections": {
    "main": { "type": "main-product" }
  },
  "order": ["main"]
}
```

## Key Patterns

### State Management
Use the pub/sub system for cross-component communication:
```javascript
import { publish, subscribe } from './pubsub.js';
subscribe('cart:update', (state) => { /* handle */ });
publish('cart:update', { items: [] });
```

### Loading CSS Dynamically
Sections lazy-load their CSS:
```liquid
{{ 'section-name.css' | asset_url | stylesheet_tag }}
```

### Responsive Images
Use Shopify's image API:
```liquid
{{ image | image_url: width: 500 | image_tag }}
```

## Configuration

### settings_schema.json
Defines the theme customization UI - color schemes, typography, layout options.

### settings_data.json
Current theme settings. The `current` key contains active configuration.

## Localization

Default language file: `locales/en.default.json`. Use translation keys:
```liquid
{{ 'general.search.placeholder' | t }}
```
