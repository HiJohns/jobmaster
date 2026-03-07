# JobMaster Frontend

## Tech Stack

- **Framework**: React 18 + TypeScript (strict)
- **UI Library**: Ant Design 5.x
- **State Management**: Zustand + React Query
- **Build Tool**: Vite

## Directory Structure

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom React hooks
│   ├── stores/        # Zustand stores
│   ├── services/      # API clients
│   ├── types/         # TypeScript types
│   └── utils/         # Utility functions
├── public/            # Static assets
└── package.json
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Coding Standards

Following Airbnb React/JSX Style Guide:
- Use functional components with hooks
- Strict TypeScript typing (no `any`)
- UI components decoupled from data fetching
- Support read-only mode (`isImpersonated`)

---

*Part of JobMaster (工单匠) - Intelligent Work Order Management System*
