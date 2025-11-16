-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create enum types
CREATE TYPE user_role AS ENUM ('client', 'provider');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'canceled', 'completed', 'refunded', 'no_show');
CREATE TYPE payment_status AS ENUM ('unpaid', 'paid', 'refunded');
CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'past_due', 'canceled');
CREATE TYPE report_status AS ENUM ('open', 'under_review', 'resolved', 'rejected');
CREATE TYPE target_type AS ENUM ('review', 'media', 'profile');
CREATE TYPE media_type AS ENUM ('image', 'video');

-- Create profiles table
CREATE TABLE profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    locale TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create provider_profiles table
CREATE TABLE provider_profiles (
    provider_id UUID PRIMARY KEY REFERENCES profiles(user_id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    bio TEXT,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip TEXT NOT NULL,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    hero_image_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    stripe_connect_id TEXT,
    subscription_status subscription_status DEFAULT 'inactive',
    subscription_price_id TEXT,
    subscription_current_period_end TIMESTAMPTZ,
    cancellation_window_hours INTEGER DEFAULT 24,
    cancellation_fee_bps INTEGER DEFAULT 0,
    no_show_fee_bps INTEGER DEFAULT 5000,
    lead_time_hours INTEGER DEFAULT 2,
    max_future_days INTEGER DEFAULT 60,
    allow_double_booking BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create services table
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES provider_profiles(provider_id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id),
    title TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    price_cents INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create availability_rules table
CREATE TABLE availability_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES provider_profiles(provider_id) ON DELETE CASCADE,
    weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6), -- 0 = Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    buffer_minutes INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create availability_exceptions table
CREATE TABLE availability_exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES provider_profiles(provider_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    is_open BOOLEAN DEFAULT FALSE,
    start_time TIME,
    end_time TIME,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES profiles(user_id),
    provider_id UUID NOT NULL REFERENCES provider_profiles(provider_id),
    service_id UUID NOT NULL REFERENCES services(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    timezone TEXT NOT NULL,
    status booking_status DEFAULT 'pending',
    total_price_cents INTEGER NOT NULL,
    tip_cents INTEGER DEFAULT 0,
    tax_cents INTEGER DEFAULT 0,
    platform_fee_cents INTEGER NOT NULL,
    payment_status payment_status DEFAULT 'unpaid',
    cancellation_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    stripe_payment_intent_id TEXT UNIQUE NOT NULL,
    stripe_charge_id TEXT,
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'usd',
    status payment_status NOT NULL,
    refund_amount_cents INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payouts table
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES provider_profiles(provider_id),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    stripe_transfer_id TEXT UNIQUE NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'usd',
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reviewer_id UUID NOT NULL REFERENCES profiles(user_id),
    reviewee_id UUID NOT NULL REFERENCES profiles(user_id),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    text TEXT,
    is_reported BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(reviewer_id, booking_id)
);

-- Create reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES profiles(user_id),
    target_type target_type NOT NULL,
    target_id UUID NOT NULL,
    reason TEXT NOT NULL,
    status report_status DEFAULT 'open',
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create media_assets table
CREATE TABLE media_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES provider_profiles(provider_id) ON DELETE CASCADE,
    type media_type NOT NULL,
    storage_path TEXT UNIQUE NOT NULL,
    width INTEGER,
    height INTEGER,
    duration_seconds INTEGER,
    size_bytes INTEGER NOT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create feature_flags table
CREATE TABLE feature_flags (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES profiles(user_id),
    action TEXT NOT NULL,
    target_table TEXT NOT NULL,
    target_id UUID NOT NULL,
    diff JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create admin_users table
CREATE TABLE admin_users (
    user_id UUID PRIMARY KEY REFERENCES profiles(user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_provider_profiles_city_state ON provider_profiles(city, state);
CREATE INDEX idx_provider_profiles_verified ON provider_profiles(is_verified);
CREATE INDEX idx_provider_profiles_subscription ON provider_profiles(subscription_status);
CREATE INDEX idx_services_provider_active ON services(provider_id, is_active);
CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_bookings_provider_time ON bookings(provider_id, start_time);
CREATE INDEX idx_bookings_client ON bookings(client_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_availability_rules_provider ON availability_rules(provider_id, is_active);
CREATE INDEX idx_availability_exceptions_provider_date ON availability_exceptions(provider_id, date);
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX idx_media_assets_provider ON media_assets(provider_id);
CREATE INDEX idx_reports_status ON reports(status);

-- Create GIS index for location searches
CREATE INDEX idx_provider_profiles_location ON provider_profiles USING GIST (ST_Point(lng, lat));

-- Create full-text search indexes
CREATE INDEX idx_provider_profiles_search ON provider_profiles USING gin(to_tsvector('english', business_name || ' ' || COALESCE(bio, '')));
CREATE INDEX idx_services_search ON services USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Create functions for updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_provider_profiles_updated_at BEFORE UPDATE ON provider_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO categories (name, slug) VALUES
    ('Hair', 'hair'),
    ('Nails', 'nails'),
    ('Makeup', 'makeup'),
    ('Skincare', 'skincare'),
    ('Lashes & Brows', 'lashes-brows');

-- Insert default feature flags
INSERT INTO feature_flags (key, value) VALUES
    ('ALLOW_DOUBLE_BOOKING', 'false'),
    ('FEATURE_SEO_PUBLIC', 'false'),
    ('FEATURE_CRON_JOBS', 'false'),
    ('PLATFORM_FEE_BPS', '1000'),
    ('MAX_IMAGE_MB', '10'),
    ('MAX_VIDEO_MB', '200');