# Beauty Book SaaS Project Instructions

This workspace contains a production-grade Beauty Book SaaS application for booking beauty services.

## Architecture
- Frontend: Next.js 15 App Router + TypeScript + Tailwind CSS + shadcn/ui
- Backend: Supabase (PostgreSQL + Auth + Storage + Realtime)
- Payments: Stripe Checkout + Connect for provider payouts
- Internationalization: next-intl for multi-language support
- Testing: Vitest (unit) + Playwright (E2E)
- Deployment: Vercel with GitHub Actions CI/CD

## Key Features
- Two user roles: clients (book services) and providers (offer services)
- Provider subscription model ($5/month configurable)
- Platform fee on bookings (10% configurable)
- Real-time availability updates
- Email notifications only (no in-app messaging)
- Admin dashboard for moderation and management
- Multi-language UI with EN default
- Comprehensive search and filtering

## Development Guidelines
- Use strict TypeScript everywhere
- Implement comprehensive RLS policies for data security
- Follow accessibility standards
- Use conventional commits with Husky pre-commit hooks
- Maintain high test coverage
- Document all major features and configurations