# Beauty Book Database Schema Documentation

## Overview

This document describes the complete database schema for the Beauty Book SaaS application. The schema is designed for a two-sided marketplace connecting beauty service clients with providers.

## Architecture Principles

- **Row Level Security (RLS)**: Every table has comprehensive RLS policies
- **Audit Trail**: No destructive deletes; status fields for soft deletes
- **Performance**: Strategic indexes for common query patterns
- **Scalability**: UUID primary keys, proper foreign key relationships
- **Data Integrity**: Check constraints and validation rules

## Core Tables

### 1. profiles
**Purpose**: Extends auth.users with application-specific user data

**Key Fields**:
- `user_id` (PK): References auth.users(id)
- `role`: Enum ('client', 'provider') - determines user capabilities
- `display_name`: Public name for the user
- `avatar_url`: Profile picture URL
- `phone`: Contact phone number
- `locale`: Preferred language (default: 'en')

**RLS Policies**:
- Public read access (user directory)
- Users can CRUD their own profile
- No deletion allowed (linked to auth.users)

### 2. categories
**Purpose**: Service categorization for search and organization

**Key Fields**:
- `id` (PK): UUID identifier
- `name`: Human-readable category name
- `slug`: URL-friendly identifier

**RLS Policies**:
- Public read access
- Only admins can modify

**Initial Data**:
- Hair Services, Nail Services, Skin Care, Makeup
- Massage Therapy, Eyebrow & Lash Services
- Body Treatments, Wellness Services

### 3. provider_profiles
**Purpose**: Business information for service providers

**Key Fields**:
- `provider_id` (PK): References profiles(user_id)
- `business_name`: Public business name
- `bio`: Business description
- `address_*`: Full address fields
- `lat`/`lng`: Coordinates for location search
- `is_verified`: Admin verification status
- `stripe_connect_id`: For payment processing
- `subscription_status`: Enum for billing status
- `onboarding_status`: Enum ('not_started', 'in_progress', 'completed') - tracks provider setup progress
- Business rule fields: lead_time, cancellation_window, fees

**Onboarding Status System**:
- `not_started`: New provider, hasn't begun setup
- `in_progress`: Provider has started but not completed onboarding
- `completed`: All required setup steps finished (profile, services, availability)

**RLS Policies**:
- Public can read verified providers
- Providers can CRUD their own profile
- Admins can access all

### 4. services
**Purpose**: Individual services offered by providers

**Key Fields**:
- `id` (PK): UUID identifier
- `provider_id`: Links to provider_profiles
- `category_id`: Links to categories
- `title`: Service name
- `description`: Detailed description
- `duration_minutes`: Service duration (15-480 min)
- `price_cents`: Price in cents
- `is_active`: Enable/disable service

**RLS Policies**:
- Public can read active services from verified providers
- Providers can CRUD their own services

### 5. availability_rules & availability_exceptions
**Purpose**: Provider availability management

**availability_rules** (recurring weekly schedule):
- `weekday`: 0=Sunday, 6=Saturday
- `start_time`/`end_time`: Daily hours
- `buffer_minutes`: Time between appointments

**availability_exceptions** (date-specific overrides):
- `date`: Specific date
- `is_open`: Override open/closed status
- Custom hours for special dates

**RLS Policies**:
- Public can read for verified providers
- Providers can CRUD their own availability

### 6. bookings
**Purpose**: Client appointment bookings

**Key Fields**:
- `id` (PK): UUID identifier
- `client_id`/`provider_id`/`service_id`: Relationship keys
- `start_time`/`end_time`: Appointment window
- `timezone`: Client timezone
- `status`: Enum (pending, confirmed, canceled, completed, refunded, no_show)
- `total_price_cents`: Final price
- `tip_cents`/`tax_cents`/`platform_fee_cents`: Price breakdown
- `payment_status`: Enum (unpaid, paid, refunded)

**Business Logic**:
- Platform fee calculated at booking time
- Immutable after payment
- Status changes logged

**RLS Policies**:
- Clients see their bookings
- Providers see bookings for their services
- No deletion (audit trail)

### 7. payments & payouts
**Purpose**: Financial transaction records

**payments**:
- Links to Stripe payment intents
- Tracks refunds
- Immutable audit trail

**payouts**:
- Provider payments via Stripe Connect
- Links to specific bookings
- Status tracking

**RLS Policies**:
- Users see payments for their bookings
- Providers see their payouts
- System-only creation/updates

### 8. reviews
**Purpose**: Rating and feedback system

**Key Fields**:
- `reviewer_id`/`reviewee_id`: Who reviewed whom
- `booking_id`: Links to completed booking
- `rating`: 1-5 stars
- `text`: Optional written review
- `is_reported`: Moderation flag

**Business Rules**:
- One review per booking
- Only after completed bookings
- No deletion (for integrity)

**RLS Policies**:
- Public read (except reported)
- Clients can review completed bookings
- No deletion

### 9. reports
**Purpose**: Content moderation system

**Key Fields**:
- `target_type`: What's being reported (review, media, profile)
- `target_id`: ID of reported content
- `reason`: Report description
- `status`: Enum (open, under_review, resolved, rejected)

**RLS Policies**:
- Users see their own reports
- Admins see all reports
- No deletion

### 10. media_assets
**Purpose**: Provider photos and videos

**Key Fields**:
- `provider_id`: Owner
- `type`: Enum (image, video)
- `storage_path`: File location
- Dimensions and file size
- `is_public`: Visibility control

**RLS Policies**:
- Public can see public media
- Providers can CRUD their own media

## Supporting Tables

### admin_users
- Superuser allowlist
- Enables admin-only features

### feature_flags
- A/B testing and feature rollouts
- JSON values for flexibility

### audit_logs
- System action logging
- JSON diff tracking
- Immutable audit trail

## Middleware & Routing System

### Provider Onboarding Guard

The application includes comprehensive middleware that enforces provider onboarding completion before accessing provider-specific features.

**Middleware Logic**:
- Checks `onboarding_status` for all providers accessing `/provider/*` routes
- Redirects incomplete providers to onboarding flow
- Allows completed providers to access dashboard and features
- Bypasses checks for onboarding pages themselves

**Route Protection Rules**:
1. **Anonymous users**: Redirected to sign-in for protected routes
2. **Incomplete providers**: Forced to complete onboarding before dashboard access
3. **Completed providers**: Full access to provider features
4. **Clients**: Normal access to client features
5. **Public routes**: Always accessible

**Onboarding Status Updates**:
- Status automatically set to 'in_progress' when provider begins setup
- Completion triggered when all required fields are filled:
  - Profile information (business_name, bio, address)
  - At least one service created
  - Availability rules configured
- Audit logs track all status changes with timestamps

**Post-Login Routing**:
- Providers with incomplete onboarding → `/provider/onboarding`
- Completed providers → `/provider/dashboard`  
- Clients → `/client/dashboard`
- Role-based landing pages ensure proper user experience

## Indexes Strategy

### Performance Indexes
- Provider location search: `(lat, lng)`
- Booking time ranges: `(provider_id, start_time)`
- Payment lookups: `(stripe_payment_intent_id)`
- Review aggregation: `(reviewee_id, rating)`

### Full-Text Search
- Provider search: `business_name` + `bio`
- Service search: `title` + `description`
- Uses PostgreSQL GIN indexes

### Filtered Indexes
- Only verified providers
- Only active subscriptions
- Only active services

## Security Model

### Row Level Security (RLS)
Every table has comprehensive RLS policies enforcing:
- Data isolation between users
- Role-based access control
- Admin bypass capabilities
- Public data visibility rules

### Key Security Features
- No hardcoded permissions
- Policy-based access control
- Immutable audit trails
- Soft deletes for data integrity

### Admin Capabilities
Admins can:
- Access all user data
- Modify categories and feature flags
- Manage content moderation
- View audit logs

## Future Considerations

### PostGIS Integration
Current `lat`/`lng` fields can be upgraded to PostGIS `geography` type for:
- Radius searches
- Distance calculations
- Spatial indexing

### Partitioning Strategy
Consider partitioning for high-volume tables:
- `bookings` by month
- `audit_logs` by quarter
- `payments` by year

### Read Replicas
- Search queries can use read replicas
- Analytics can run on separate instances
- Real-time features need primary DB

## Data Relationships

```
auth.users
    ↓
profiles (1:1)
    ↓
provider_profiles (1:1, providers only)
    ↓
services (1:many)
availability_rules (1:many)
availability_exceptions (1:many)
media_assets (1:many)

Bookings connect:
- client (profiles.user_id)
- provider (provider_profiles.provider_id)  
- service (services.id)

Reviews connect:
- reviewer (profiles.user_id)
- reviewee (profiles.user_id)
- booking (bookings.id)
```

## Migration Strategy

1. **Initial Schema**: All tables, indexes, functions
2. **RLS Policies**: Comprehensive security rules
3. **Onboarding Status**: Provider completion tracking system
4. **Onboarding RLS**: Security policies for status management
5. **Initial Data**: Categories, feature flags
6. **Indexes**: Performance optimization

**Migration Files**:
- `20241109000001_initial_schema.sql`: Core tables and relationships
- `20241109000002_rls_policies.sql`: Row Level Security implementation
- `20241109000003_add_onboarding_status.sql`: Provider onboarding tracking
- `20241109000004_onboarding_rls.sql`: RLS policies and audit logging for onboarding

All migrations include both up and down paths for safe deployment.