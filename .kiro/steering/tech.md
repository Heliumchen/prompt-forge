# Technology Stack

## Framework & Build System

- **Next.js 15.3.0** with App Router
- **React 19** with TypeScript
- **Tailwind CSS 4** for styling
- **Turbopack** for fast development builds

## UI Components

- **Radix UI** primitives for accessible components
- **Lucide React** for icons
- **shadcn/ui** component library
- **Sonner** for toast notifications
- **next-themes** for dark/light mode

## LLM Integration

- Custom **LLM.js** library for multi-provider support
- Supports: OpenAI, Anthropic, Google, Groq, Together, Perplexity, DeepSeek, Mistral
- Streaming responses with real-time UI updates
- Browser-based API calls (no server proxy)

## Data Management

- **Local Storage** for all data persistence
- **React Context** for state management
- Version control system for prompts
- No external database dependencies

## Development Commands

```bash
# Install dependencies
npm install

# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Key Libraries

- `class-variance-authority` and `clsx` for conditional styling
- `cmdk` for command palette functionality
- `cross-fetch` for API requests
- `date-fns` for date manipulation
- `eventemitter3` for event handling