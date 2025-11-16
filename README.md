# Beauty Book - Beauty Services Booking Platform

A full-stack SaaS application for booking beauty services, built with Next.js 15, Supabase, and Stripe.

## 🌟 Features

### For Clients
- **Discover Providers**: Search beauty providers by location, category, rating, and availability
- **Easy Booking**: Book services with real-time availability and secure payments
- **Profile Management**: Manage personal information and booking history
- **Reviews & Ratings**: Leave reviews for completed services

### For Providers
- **Business Profile**: Comprehensive business profiles with media galleries
- **Service Management**: Create and manage services with pricing and duration
- **Availability Control**: Set working hours, exceptions, and booking rules
- **Payment Processing**: Receive payouts via Stripe Connect
- **Subscription Management**: $5/month subscription with Stripe integration

### For Administrators
- **Comprehensive Dashboard**: Monitor platform metrics and user activity
- **Content Moderation**: Review and resolve reported content
- **Payment Management**: Handle refunds and dispute resolution
- **User Management**: Verify providers and manage user accounts

## 🏗 Architecture

- **Frontend**: Next.js 15 App Router with TypeScript
- **Backend**: Next.js API Routes + Supabase
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with role-based access control
- **Payments**: Stripe Checkout + Connect for provider payouts
- **Storage**: Supabase Storage for media files
- **Styling**: Tailwind CSS + shadcn/ui components
- **Deployment**: Vercel with GitHub Actions CI/CD

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Stripe account (test mode for development)
- Git

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone [your-repo-url]
   cd beautybook
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Fill in your environment variables:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # Stripe
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_ID_PROVIDER_MONTHLY=price_...
   
   # Other required variables (see .env.example)
   ```

4. **Set up the database**
   ```bash
   # Run migrations in your Supabase SQL editor
   # Copy and paste the content from:
   # - supabase/migrations/20241109000001_initial_schema.sql
   # - supabase/migrations/20241109000002_rls_policies.sql
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database Setup

1. Create a new Supabase project
2. Run the SQL migrations in the Supabase SQL editor:
   - Execute `supabase/migrations/20241109000001_initial_schema.sql`
   - Execute `supabase/migrations/20241109000002_rls_policies.sql`
3. Configure your environment variables with the Supabase credentials

### Stripe Setup

1. Create a Stripe account and get your API keys
2. Set up a monthly subscription product for providers ($5/month)
3. Configure webhook endpoints for payment events
4. Enable Stripe Connect for provider payouts

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── login/             # Authentication pages
│   ├── signup/
│   ├── client/            # Client-specific pages
│   ├── provider/          # Provider-specific pages
│   └── admin/             # Admin dashboard
├── components/            # Reusable UI components
│   ├── ui/                # shadcn/ui components
│   └── [feature]/         # Feature-specific components
├── lib/                   # Utility functions
│   ├── auth/              # Authentication utilities
│   ├── payments/          # Stripe integration
│   ├── supabase.ts        # Supabase client configuration
│   └── types.ts           # TypeScript type definitions
└── test/                  # Test files and configuration

supabase/
├── migrations/            # Database migrations
└── policies/              # Row Level Security policies

docs/                      # Documentation
├── setup.md
├── deployment.md
└── api.md
```

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Type checking
npm run typecheck

# Linting
npm run lint
```

## 🚀 Deployment

### Vercel Deployment

1. **Connect to Vercel**
   - Push your code to GitHub
   - Import project in Vercel dashboard
   - Configure environment variables

2. **Set up domains**
   - Configure custom domain in Vercel (optional)
   - Update `NEXT_PUBLIC_SITE_URL` environment variable

3. **Configure webhooks**
   - Set up Stripe webhook endpoints pointing to your production URL
   - Update webhook secrets in environment variables

### GitHub Actions

The project includes GitHub Actions for CI/CD:
- Automated testing on pull requests
- Type checking and linting
- Deployment to Vercel on main branch

## 📊 Key Features in Detail

### Authentication & Authorization
- Role-based access (Client, Provider, Admin)
- Secure JWT tokens via Supabase
- Row Level Security for data protection
- Social login options (configurable)

### Booking System
- Real-time availability checking
- Time zone support
- Cancellation policies and fees
- No-show tracking
- Automated reminders (configurable)

### Payment Processing
- Secure payment collection via Stripe Checkout
- Platform fee collection (configurable %)
- Provider subscription management
- Automated payouts to providers
- Refund and dispute handling

### Search & Discovery
- Location-based search with radius filtering
- Category and service filtering
- Price range filtering
- Rating and review filtering
- Availability-based search

### Content Management
- Provider media galleries (images/videos)
- Service descriptions and portfolios
- Review and rating system
- Content moderation tools

## 🔧 Configuration

### Feature Flags
The platform uses feature flags for gradual rollouts:
- `FEATURE_SEO_PUBLIC`: Enable public SEO features
- `FEATURE_CRON_JOBS`: Enable automated background jobs
- `ALLOW_DOUBLE_BOOKING`: Allow providers to double-book slots

### Platform Settings
- Platform fee percentage (default 10%)
- Provider subscription price (default $5/month)
- Media upload limits
- Cancellation policies
- Notification preferences

## 📚 Documentation

- [Setup Guide](docs/setup.md)
- [Database Schema](docs/database.md)
- [API Reference](docs/api.md)
- [Deployment Guide](docs/deployment.md)
- [Security Overview](docs/security.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Check the [documentation](docs/)
- Open an issue on GitHub
- Review the [setup guide](docs/setup.md)

## 🎯 Roadmap

- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Multi-language content management
- [ ] Advanced booking automation
- [ ] Integration with external calendar systems
- [ ] White-label solutions