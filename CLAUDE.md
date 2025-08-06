# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Prompt Forge is a local-first, open-source prompt engineering tool built with Next.js and React. It helps users create, test, and optimize prompts for LLMs with features like prompt versioning, variable substitution, and batch testing through test sets.

**Key Architecture Principles:**
- Local-first: All data stored in browser localStorage, no server uploads
- Context-driven: Project and TestSet contexts manage state across the app
- Version-controlled prompts: Each project supports multiple versions with rollback capability

## Development Commands

```bash
# Development server with Turbopack
npm run dev

# Build production version
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Run tests
npm test
```

## Core Architecture

### Data Flow
- **ProjectContext** (`src/contexts/ProjectContext.tsx`): Manages projects, prompts, messages, variables, and versioning
- **TestSetContext** (`src/contexts/TestSetContext.tsx`): Handles test case management, execution, and result tracking
- **Storage Layer**: 
  - `src/lib/storage.ts`: Project data persistence and variable synchronization
  - `src/lib/testSetStorage.ts`: Test set data management

### Key Data Models
- **Project**: Container for prompts with version history, variables, and model configuration
- **TestSet**: Collection of test cases associated with a project for batch testing
- **Version**: Immutable snapshot of project state (prompts, variables, model config)
- **Variable**: Template variables in format `{{variableName}}` for prompt substitution

### Component Structure
- **UI Components**: `src/components/ui/` - Radix-based component library
- **Feature Components**: `src/components/` - App-specific components like tables, dialogs, controls
- **Layouts**: App uses sidebar navigation with project/test set selection

### API Integration
- OpenRouter client (`src/lib/openrouter/`) for LLM API calls
- Support for multiple models with configurable parameters (temperature, max_tokens, etc.)
- Batch execution with concurrency limits and retry logic

## Testing Patterns

- Uses Vitest for unit testing
- Component tests with React Testing Library
- Storage layer has comprehensive test coverage
- Test files use `.test.tsx` or `.test.ts` extension

## Important Implementation Notes

- Variable synchronization is automatic when prompts change
- Test execution supports cancellation and retry on failure  
- All state changes go through React contexts for consistency
- LocalStorage operations include error handling and data migration
- Batch test execution respects API rate limits (concurrency: 3)

## Key File Locations

- Context providers: `src/contexts/`
- Storage utilities: `src/lib/storage.ts`, `src/lib/testSetStorage.ts`
- Variable processing: `src/lib/variableUtils.ts`
- OpenRouter integration: `src/lib/openrouter/`
- Type definitions: `src/types/llm.d.ts`