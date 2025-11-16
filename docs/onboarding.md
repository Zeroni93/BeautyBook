# Provider Onboarding & Routing Documentation

## Overview

The Beauty Book application includes a comprehensive provider onboarding system that ensures providers complete all necessary setup steps before accessing provider features. This system combines database state tracking with middleware-based route protection.

## Onboarding Status States

### Database Schema

The `provider_profiles` table includes an `onboarding_status` enum field with three possible values:

```sql
CREATE TYPE onboarding_status_enum AS ENUM (
  'not_started',
  'in_progress', 
  'completed'
);
```

### Status Definitions

- **not_started**: New provider who hasn't begun the onboarding process
- **in_progress**: Provider has started but not yet completed all required setup steps
- **completed**: Provider has finished all onboarding requirements and can access full features

## Onboarding Requirements

For a provider to reach "completed" status, they must have:

1. **Profile Information**:
   - Business name
   - Bio/description
   - Complete address
   - Phone number

2. **Services**:
   - At least one service created
   - Proper categorization
   - Valid pricing and duration

3. **Availability**:
   - At least one availability rule configured
   - Buffer times set appropriately

4. **Stripe Connect** (optional):
   - Connected Stripe account for payments
   - Completed through Stripe Connect onboarding

## Middleware Route Protection

### Protected Routes

The middleware enforces onboarding completion for these route patterns:

- `/provider/dashboard`
- `/provider/services`
- `/provider/availability`
- `/provider/gallery`
- `/provider/payouts`
- Any other `/provider/*` routes except onboarding

### Bypass Routes

These routes are accessible regardless of onboarding status:

- `/provider/onboarding/*` - The onboarding flow itself
- `/provider/stripe/return` - Stripe Connect callback
- `/` - Public homepage
- `/providers` - Provider directory
- `/auth/*` - Authentication pages

### Redirect Logic

```typescript
// Simplified middleware logic
if (isProvider && !isOnboardingComplete) {
  if (!isOnboardingRoute) {
    return NextResponse.redirect('/provider/onboarding')
  }
}
```

## Status Transition Flow

### 1. New Provider Registration

```
Initial State: onboarding_status = 'not_started'
↓
User accesses /provider/dashboard
↓
Middleware redirects to /provider/onboarding
↓
Status automatically updated to 'in_progress'
```

### 2. Onboarding Progression

```
in_progress → completing form steps → still in_progress
↓
Final step (availability) submitted with all requirements met
↓
Status updated to 'completed'
↓
User redirected to /provider/dashboard
```

### 3. Stripe Connect Integration

```
Onboarding completed without Stripe
↓
Status = 'completed', can access dashboard
↓
Optional: Link Stripe Connect account
↓
Return from Stripe updates additional profile fields
↓
Status remains 'completed'
```

## Implementation Details

### Status Checking Function

```typescript
// lib/provider.ts
export async function getProviderOnboardingStatus(
  supabase: SupabaseClient,
  userId: string
) {
  // Fetches provider profile and calculates completion
  // Returns: { isComplete, dbStatus, hasProfile, hasServices, hasAvailability }
}
```

### Completion Update Function

```typescript
// lib/provider.ts
export async function completeOnboarding(
  supabase: SupabaseClient,
  userId: string
) {
  // Updates onboarding_status to 'completed'
  // Creates audit log entry
}
```

### Middleware Integration

```typescript
// middleware.ts
const onboardingStatus = await getProviderOnboardingStatus(supabase, user.id)

if (!onboardingStatus.isComplete && !isOnboardingRoute) {
  return NextResponse.redirect(new URL('/provider/onboarding', request.url))
}
```

## Post-Login Routing

### Landing Page Logic

After successful authentication, users are routed based on role and onboarding status:

```typescript
// Auth callback logic
if (profile?.role === 'provider') {
  const onboardingStatus = await getProviderOnboardingStatus(supabase, user.id)
  
  if (onboardingStatus.isComplete) {
    router.push('/provider/dashboard')
  } else {
    router.push('/provider/onboarding')
  }
} else {
  router.push('/client/dashboard')
}
```

### Manual Status Override

For development and testing, onboarding status can be manually updated:

```sql
-- Force complete a provider's onboarding
UPDATE provider_profiles 
SET onboarding_status = 'completed' 
WHERE provider_id = '[user_id]';

-- Reset provider to start over
UPDATE provider_profiles 
SET onboarding_status = 'not_started' 
WHERE provider_id = '[user_id]';
```

## Audit Logging

All onboarding status changes are automatically logged to the `audit_logs` table:

```sql
-- Trigger function logs status changes
CREATE TRIGGER provider_onboarding_status_audit
  AFTER UPDATE ON provider_profiles
  FOR EACH ROW
  WHEN (OLD.onboarding_status IS DISTINCT FROM NEW.onboarding_status)
  EXECUTE FUNCTION log_onboarding_status_change();
```

Log entries include:
- User ID and timestamp
- Previous and new status
- Action context (manual vs automatic)

## Testing

### E2E Test Coverage

The `e2e/provider-onboarding-redirect.spec.ts` file provides comprehensive testing:

1. **Incomplete Provider Redirect**: Verifies middleware redirects to onboarding
2. **Complete Onboarding Flow**: Tests full progression from start to completion  
3. **Completed Provider Access**: Ensures completed providers can access dashboard
4. **Role-based Protection**: Confirms client/provider route separation
5. **Anonymous User Handling**: Tests unauthenticated access patterns

### Manual Testing

Use the test scenarios in the E2E test file to manually verify:

```sql
-- Create test provider with incomplete onboarding
INSERT INTO provider_profiles (provider_id, onboarding_status) 
VALUES ('[test_user_id]', 'in_progress');

-- Test various completion states by updating status
UPDATE provider_profiles SET onboarding_status = 'completed' 
WHERE provider_id = '[test_user_id]';
```

## Security Considerations

### Row Level Security

The onboarding status is protected by RLS policies:

- Providers can only read/update their own status
- Admins have full access for moderation
- Public users cannot see onboarding status

### Middleware Security

The middleware enforces onboarding completion server-side:

- Cannot be bypassed by client-side navigation
- Protects against direct URL access
- Validates status on every request

### Audit Trail

Complete audit logging ensures:

- All status changes are tracked
- Historical progression is preserved
- Administrative actions are logged
- Compliance and debugging support

## Troubleshooting

### Common Issues

1. **Provider stuck in onboarding loop**
   - Check database status vs calculated completion
   - Verify all required fields are present
   - Review audit logs for status change history

2. **Middleware not redirecting**
   - Confirm user role is 'provider' 
   - Check middleware route matching logic
   - Verify Supabase client has proper credentials

3. **Status not updating on completion**
   - Review onboarding form submission handler
   - Check for database transaction errors
   - Verify trigger functions are active

### Debug Queries

```sql
-- Check provider onboarding status
SELECT p.display_name, pp.business_name, pp.onboarding_status,
       COUNT(s.id) as service_count,
       COUNT(ar.id) as availability_rules
FROM profiles p
JOIN provider_profiles pp ON p.user_id = pp.provider_id
LEFT JOIN services s ON pp.provider_id = s.provider_id AND s.is_active = true
LEFT JOIN availability_rules ar ON pp.provider_id = ar.provider_id
WHERE p.user_id = '[user_id]'
GROUP BY p.user_id, p.display_name, pp.business_name, pp.onboarding_status;

-- View audit trail for status changes
SELECT * FROM audit_logs 
WHERE user_id = '[user_id]' 
  AND action LIKE '%onboarding%'
ORDER BY created_at DESC;
```

This comprehensive onboarding system ensures a smooth provider setup experience while maintaining security and providing full audit trails for compliance and debugging.