# RiskCheck XUL10

## Overview

RiskCheck XUL10 is a risk assessment educational web application for evaluating Martingale vs Linear Averaging trading strategies on XUL10 (SPA PBK) gold transactions. The app provides risk status classifications (AMAN/BERISIKO/TIDAK LAYAK) with scores based on thesis research parameters. This is strictly an educational risk mitigation tool - not a trading platform or signal provider.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with CSS variables for theming
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful JSON API
- **Build Process**: esbuild for production bundling with dependency allowlisting
- **Development**: tsx for TypeScript execution, Vite dev server for HMR

### Data Flow
1. User submits risk parameters via form on home page
2. Parameters passed as URL query strings to result page
3. Result page fetches risk calculation from `/api/calculate-risk` endpoint
4. Server applies rule-based scoring algorithm from thesis research
5. Returns risk status, score, warnings, and psychology notes

### Risk Calculation Engine
Located in `server/rules.ts`, implements thesis-derived metrics:
- Hardcoded performance metrics (PF, ROM, ER, MC Risk) per strategy/target combination
- Modal ratio scoring against optimal USD 200,000 benchmark
- Weighted factors: strategy type, market conditions, experience level, layer count
- Score ranges: 0-39 (AMAN), 40-69 (BERISIKO), 70-100 (TIDAK LAYAK)

### Shared Code
- `shared/schema.ts`: Zod schemas for input validation and TypeScript types
- Used by both frontend form validation and backend API validation

### Design System
- Material Design 3 principles adapted for financial applications
- Typography: Inter (UI), JetBrains Mono (numerical data)
- Bilingual UI (Indonesian/English) for all risk-related content

## External Dependencies

### Database
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Schema Location**: `shared/schema.ts`
- **Migrations**: `migrations/` directory via drizzle-kit
- **Current State**: Schema defined but storage currently uses in-memory implementation (`MemStorage` class)

### UI Component Dependencies
- Radix UI primitives for accessible components
- class-variance-authority for component variants
- Lucide React for icons
- embla-carousel-react for carousels
- react-day-picker for date selection
- recharts for data visualization
- vaul for drawer components

### Development Tools
- Replit-specific plugins: runtime error overlay, cartographer, dev banner
- PostCSS with Tailwind and autoprefixer