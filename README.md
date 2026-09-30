# FormFlow

Professional form builder for small businesses, freelancers, agencies, creators, and marketers.  
"Professional forms without Typeform pricing."

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth v5 (Credentials provider)
- **Testing**: Vitest + React Testing Library
- **Validation**: Zod

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm or pnpm

## Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your configuration:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/formflow?schema=public"

   # Authentication (generate with: openssl rand -base64 32)
   AUTH_SECRET="your-auth-secret-here"
   NEXTAUTH_SECRET="your-nextauth-secret-here"
   NEXTAUTH_URL="http://localhost:3000"

   # Application
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   NEXT_PUBLIC_APP_NAME="FormFlow"
   ```

## Database Setup

1. Start PostgreSQL locally (or use Docker):
   ```bash
   # Using Docker
   docker run --name formflow-db \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=formflow \
     -p 5432:5432 \
     -d postgres:16
   ```

2. Run database migrations:
   ```bash
   npm run db:migrate
   ```

3. (Optional) Open Prisma Studio to view data:
   ```bash
   npm run db:studio
   ```

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Type check
npx tsc --noEmit

# Generate Prisma client
npm run db:generate

# Push schema changes (development)
npm run db:push

# Run migrations
npm run db:migrate
```

## Production Build

```bash
# Build for production
npm run build

# Start production server
npm run start
```

## Project Structure

```
src/
├── app/
│   ├── api/auth/[...nextauth]/   # NextAuth API routes
│   ├── auth/                     # Auth pages (signin, signup, error)
│   ├── dashboard/                # Protected dashboard pages
│   │   ├── forms/                # Forms management
│   │   ├── responses/            # Responses viewing
│   │   ├── settings/             # User settings
│   │   └── billing/              # Billing/subscription
│   ├── layout.tsx                # Root layout with SessionProvider
│   ├── page.tsx                  # Landing page
│   └── globals.css               # Global styles
├── components/
│   ├── ui/                       # Reusable UI components
│   └── dashboard/                # Dashboard-specific components
├── lib/
│   ├── auth/                     # NextAuth configuration
│   ├── prisma.ts                 # Prisma client singleton
│   └── utils/                    # Utility functions
├── middleware.ts                 # Auth middleware
└── actions/                      # Server actions (future)
```

## Database Schema

The Prisma schema includes the following models:

- **User** - User accounts with credentials
- **Account** - OAuth accounts (for future providers)
- **Session** - User sessions
- **VerificationToken** - Email verification tokens
- **Form** - Form definitions
- **FormField** - Form fields (inputs, selects, etc.)
- **LogicRule** - Conditional logic rules
- **Response** - Form submissions
- **ResponseValue** - Individual field responses
- **Subscription** - Stripe subscription data
- **Usage** - Usage tracking for limits

## Authentication

FormFlow uses NextAuth v5 with a credentials provider:

- Email/password authentication
- Passwords hashed with bcrypt (12 rounds)
- JWT session strategy
- Protected routes via middleware

### Auth Pages

- `/auth/signin` - Sign in page
- `/auth/signup` - Registration page
- `/auth/error` - Error handling page

## Protected Dashboard

The dashboard at `/dashboard` requires authentication and includes:

- **Forms** - List and manage forms (empty state with "Create your first form" CTA)
- **Responses** - View form submissions
- **Settings** - Profile and account settings
- **Billing** - Subscription management (placeholder for Phase 2)
- **Navigation** - Sidebar with user menu

## Testing

```bash
# Run all tests
npm run test

# Run tests with UI
npx vitest --ui
```

Tests are located alongside source files in `__tests__` directories.

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Phase 1 Status

✅ **Completed:**
- Next.js 16 with TypeScript and Tailwind CSS
- Prisma schema with all planned models
- NextAuth v5 authentication (credentials)
- Protected dashboard with navigation
- Forms page with empty state
- Responses page
- Settings page
- Billing page (placeholder)
- User menu with sign out
- Environment configuration
- Basic test setup
- Linting and type checking

## Phase 2 (Planned)

- Form builder (drag-and-drop)
- Public form renderer
- Response collection API
- Stripe integration
- Email notifications
- Webhooks

## License

MIT