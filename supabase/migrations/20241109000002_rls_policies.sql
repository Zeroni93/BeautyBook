-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_users 
        WHERE user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS user_role AS $$
BEGIN
    RETURN (
        SELECT role FROM profiles 
        WHERE user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL USING (is_admin(auth.uid()));

-- Categories policies (public read, admin write)
CREATE POLICY "Anyone can view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Only admins can manage categories" ON categories FOR INSERT USING (is_admin(auth.uid()));
CREATE POLICY "Only admins can update categories" ON categories FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Only admins can delete categories" ON categories FOR DELETE USING (is_admin(auth.uid()));

-- Provider profiles policies
CREATE POLICY "Anyone can view verified provider profiles" ON provider_profiles FOR SELECT USING (is_verified = true OR auth.uid() = provider_id OR is_admin(auth.uid()));
CREATE POLICY "Providers can manage their own profile" ON provider_profiles FOR ALL USING (auth.uid() = provider_id);
CREATE POLICY "Admins can manage all provider profiles" ON provider_profiles FOR ALL USING (is_admin(auth.uid()));

-- Services policies
CREATE POLICY "Anyone can view active services from verified providers" ON services 
    FOR SELECT USING (
        is_active = true AND EXISTS (
            SELECT 1 FROM provider_profiles p 
            WHERE p.provider_id = services.provider_id 
            AND p.is_verified = true
        )
        OR auth.uid() = provider_id 
        OR is_admin(auth.uid())
    );
CREATE POLICY "Providers can manage their own services" ON services FOR ALL USING (auth.uid() = provider_id);
CREATE POLICY "Admins can manage all services" ON services FOR ALL USING (is_admin(auth.uid()));

-- Availability rules policies
CREATE POLICY "Anyone can view availability rules for verified providers" ON availability_rules
    FOR SELECT USING (
        is_active = true AND EXISTS (
            SELECT 1 FROM provider_profiles p 
            WHERE p.provider_id = availability_rules.provider_id 
            AND p.is_verified = true
        )
        OR auth.uid() = provider_id 
        OR is_admin(auth.uid())
    );
CREATE POLICY "Providers can manage their own availability rules" ON availability_rules FOR ALL USING (auth.uid() = provider_id);
CREATE POLICY "Admins can manage all availability rules" ON availability_rules FOR ALL USING (is_admin(auth.uid()));

-- Availability exceptions policies
CREATE POLICY "Anyone can view availability exceptions for verified providers" ON availability_exceptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM provider_profiles p 
            WHERE p.provider_id = availability_exceptions.provider_id 
            AND p.is_verified = true
        )
        OR auth.uid() = provider_id 
        OR is_admin(auth.uid())
    );
CREATE POLICY "Providers can manage their own availability exceptions" ON availability_exceptions FOR ALL USING (auth.uid() = provider_id);
CREATE POLICY "Admins can manage all availability exceptions" ON availability_exceptions FOR ALL USING (is_admin(auth.uid()));

-- Bookings policies
CREATE POLICY "Users can view their own bookings" ON bookings 
    FOR SELECT USING (auth.uid() = client_id OR auth.uid() = provider_id OR is_admin(auth.uid()));
CREATE POLICY "Clients can create bookings" ON bookings 
    FOR INSERT WITH CHECK (auth.uid() = client_id AND get_user_role(auth.uid()) = 'client');
CREATE POLICY "Clients can update their own bookings" ON bookings 
    FOR UPDATE USING (auth.uid() = client_id AND get_user_role(auth.uid()) = 'client');
CREATE POLICY "Providers can update bookings for their services" ON bookings 
    FOR UPDATE USING (auth.uid() = provider_id AND get_user_role(auth.uid()) = 'provider');
CREATE POLICY "Admins can manage all bookings" ON bookings FOR ALL USING (is_admin(auth.uid()));

-- Payments policies
CREATE POLICY "Users can view payments for their bookings" ON payments 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings b 
            WHERE b.id = payments.booking_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        ) OR is_admin(auth.uid())
    );
CREATE POLICY "Only system can create payments" ON payments FOR INSERT USING (false); -- Only via service role
CREATE POLICY "Admins can manage all payments" ON payments FOR ALL USING (is_admin(auth.uid()));

-- Payouts policies
CREATE POLICY "Providers can view their own payouts" ON payouts 
    FOR SELECT USING (auth.uid() = provider_id OR is_admin(auth.uid()));
CREATE POLICY "Only system can create payouts" ON payouts FOR INSERT USING (false); -- Only via service role
CREATE POLICY "Admins can manage all payouts" ON payouts FOR ALL USING (is_admin(auth.uid()));

-- Reviews policies
CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews for completed bookings" ON reviews 
    FOR INSERT WITH CHECK (
        auth.uid() = reviewer_id AND
        EXISTS (
            SELECT 1 FROM bookings b 
            WHERE b.id = reviews.booking_id 
            AND b.status = 'completed'
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );
CREATE POLICY "Users can update their own reviews" ON reviews FOR UPDATE USING (auth.uid() = reviewer_id);
CREATE POLICY "Admins can manage all reviews" ON reviews FOR ALL USING (is_admin(auth.uid()));

-- Reports policies
CREATE POLICY "Users can view their own reports" ON reports FOR SELECT USING (auth.uid() = reporter_id OR is_admin(auth.uid()));
CREATE POLICY "Users can create reports" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins can manage all reports" ON reports FOR ALL USING (is_admin(auth.uid()));

-- Media assets policies
CREATE POLICY "Anyone can view public media assets" ON media_assets FOR SELECT USING (is_public = true OR auth.uid() = provider_id OR is_admin(auth.uid()));
CREATE POLICY "Providers can manage their own media assets" ON media_assets FOR ALL USING (auth.uid() = provider_id);
CREATE POLICY "Admins can manage all media assets" ON media_assets FOR ALL USING (is_admin(auth.uid()));

-- Feature flags policies (read-only for users, write for admins)
CREATE POLICY "Anyone can view feature flags" ON feature_flags FOR SELECT USING (true);
CREATE POLICY "Only admins can manage feature flags" ON feature_flags FOR ALL USING (is_admin(auth.uid()));

-- Audit logs policies (admin only)
CREATE POLICY "Only admins can view audit logs" ON audit_logs FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Only system can create audit logs" ON audit_logs FOR INSERT USING (false); -- Only via service role

-- Admin users policies (admin only)
CREATE POLICY "Only admins can view admin users" ON admin_users FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Only admins can manage admin users" ON admin_users FOR ALL USING (is_admin(auth.uid()));