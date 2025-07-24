---
inclusion: always
---

# Product Overview

Prompt Forge is a local-first, open-source prompt engineering tool for creating, testing, and optimizing prompts for large language models (LLMs).

## Core Principles

- **Privacy First**: All data remains in browser localStorage - never send user data to external servers
- **Local-First Architecture**: No backend dependencies, works entirely offline
- **Immutable Versioning**: Create new versions rather than modifying existing data
- **Real-time Feedback**: Stream LLM responses for immediate user feedback

## Key Features

- **Multi-LLM Support**: Integrates with OpenAI, Anthropic, Google, Groq, Together, Perplexity, DeepSeek, Mistral, and local models
- **Prompt Playground**: Test prompts with variables, system messages, and conversation history
- **Version Control**: Immutable snapshots with rollback capability
- **Project Management**: Organize prompts into projects with sidebar navigation
- **LLM Evaluation**: Use LLMs to evaluate and compare prompt effectiveness

## Data Model Conventions

- **Projects** contain multiple versions and track current active version
- **Versions** are immutable snapshots containing prompts, messages, and variables
- **Prompts** are template messages with roles (system/user/assistant)
- **Messages** represent conversation history with optional image support
- Always generate unique IDs using `generateUid()` for new entities
- Use `updateProject()` and `updateVersion()` helpers for state changes

## UI/UX Guidelines

- Maintain responsive design with mobile-first approach
- Use shadcn/ui components for consistency
- Implement proper loading states for streaming responses
- Show clear visual feedback for user actions
- Support both light and dark themes
- Keep navigation intuitive with clear project/version hierarchy

## Development Patterns

- Prefer functional components with TypeScript interfaces
- Use React Context for global state management
- Implement proper error boundaries and loading states
- Follow local-first principles - no server-side data persistence
- Use streaming for real-time LLM response updates