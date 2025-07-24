# Project Structure

## Root Directory

- `src/` - Main application source code
- `public/` - Static assets
- `.next/` - Next.js build output
- `node_modules/` - Dependencies
- Configuration files: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.js`

## Source Structure (`src/`)

### Core Application (`src/app/`)
- `layout.tsx` - Root layout with providers (ProjectProvider, ThemeProvider)
- `page.tsx` - Main application page with prompt playground
- `globals.css` - Global styles and Tailwind imports

### Components (`src/components/`)
- `app-sidebar.tsx` - Main navigation sidebar
- `ui/` - Reusable UI components (shadcn/ui based)
- Component naming: kebab-case with descriptive names
- Each component handles its own state and props interface

### Business Logic (`src/lib/`)
- `storage.ts` - Local storage management and data models
- `utils.ts` - Utility functions (cn for className merging, generateUid)
- `llmjs/` - LLM integration library with provider-specific modules

### State Management (`src/contexts/`)
- `ProjectContext.tsx` - Global project state management
- Uses React Context + useState for local-first data

### Type Definitions (`src/types/`)
- `llm.d.ts` - TypeScript definitions for LLM-related types

### Custom Hooks (`src/hooks/`)
- `use-mobile.ts` - Mobile detection hook

## Key Patterns

### Data Models
- `Project` - Contains versions, current version pointer
- `Version` - Immutable snapshots with prompts, messages, variables
- `Prompt` - Template messages with role (system/user/assistant)
- `Message` - Conversation history with optional image URLs

### Component Architecture
- Functional components with TypeScript
- Props interfaces defined inline or exported
- Custom hooks for reusable logic
- Context providers for global state

### File Naming Conventions
- Components: `kebab-case.tsx`
- Hooks: `use-*.ts`
- Types: `*.d.ts`
- Utilities: descriptive names in `camelCase`

### Import Patterns
- Use `@/` alias for src imports
- Group imports: React, external libraries, internal modules
- Destructure imports when possible