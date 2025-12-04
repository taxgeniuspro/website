-- Referral System Database Schema
-- Story 1.4: Public Referral System

-- User referral profiles
CREATE TABLE IF NOT EXISTS referral_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    -- Referral identifiers
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    vanity_username VARCHAR(50) UNIQUE,

    -- Tier system
    tier VARCHAR(20) DEFAULT 'bronze',
    -- Tier values: bronze, silver, gold, platinum

    -- Statistics
    total_referrals INTEGER DEFAULT 0,
    successful_referrals INTEGER DEFAULT 0,
    pending_referrals INTEGER DEFAULT 0,
    total_earnings DECIMAL(10,2) DEFAULT 0,
    lifetime_earnings DECIMAL(10,2) DEFAULT 0,

    -- Commission rates (can override defaults)
    commission_rate DECIMAL(5,4), -- As decimal (0.10 = 10%)
    bonus_rate DECIMAL(5,4),

    -- Profile data
    display_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    testimonial TEXT,

    -- Settings
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT true,
    notify_on_referral BOOLEAN DEFAULT true,
    notify_on_signup BOOLEAN DEFAULT true,

    -- Social links
    facebook_url TEXT,
    twitter_url TEXT,
    instagram_url TEXT,
    tiktok_url TEXT,
    youtube_url TEXT,

    -- Metadata
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_referral_at TIMESTAMP WITH TIME ZONE,
    tier_updated_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_referral_profiles_user_id ON referral_profiles(user_id);
CREATE INDEX idx_referral_profiles_referral_code ON referral_profiles(referral_code);
CREATE INDEX idx_referral_profiles_vanity_username ON referral_profiles(vanity_username);
CREATE INDEX idx_referral_profiles_tier ON referral_profiles(tier);
CREATE INDEX idx_referral_profiles_is_active ON referral_profiles(is_active);

-- Individual referral tracking
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    referred_id UUID REFERENCES users(id) ON DELETE CASCADE,
    referral_code VARCHAR(20),

    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending',
    -- Status values: pending, signed_up, qualified, paid, cancelled, fraud

    -- Attribution
    source VARCHAR(50), -- facebook, twitter, whatsapp, direct, email
    campaign VARCHAR(100),
    landing_page TEXT,

    -- Conversion tracking
    signed_up_at TIMESTAMP WITH TIME ZONE,
    qualified_at TIMESTAMP WITH TIME ZONE,
    first_advance_at TIMESTAMP WITH TIME ZONE,

    -- Earnings
    referrer_bonus DECIMAL(10,2) DEFAULT 50.00,
    referred_bonus DECIMAL(10,2) DEFAULT 50.00,
    commission_amount DECIMAL(10,2) DEFAULT 0,

    -- Payment status
    referrer_paid BOOLEAN DEFAULT false,
    referrer_paid_at TIMESTAMP WITH TIME ZONE,
    referred_bonus_applied BOOLEAN DEFAULT false,

    -- Tracking data
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(20), -- mobile, tablet, desktop
    browser VARCHAR(50),
    os VARCHAR(50),

    -- Session tracking
    session_id VARCHAR(100),
    click_id VARCHAR(100),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX idx_referrals_referral_code ON referrals(referral_code);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_source ON referrals(source);
CREATE INDEX idx_referrals_created_at ON referrals(created_at DESC);

-- Referral links tracking
CREATE TABLE IF NOT EXISTS referral_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Link details
    short_code VARCHAR(20) UNIQUE NOT NULL,
    destination_url TEXT NOT NULL,
    utm_source VARCHAR(50),
    utm_medium VARCHAR(50),
    utm_campaign VARCHAR(100),
    custom_params JSONB,

    -- Statistics
    click_count INTEGER DEFAULT 0,
    unique_clicks INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,4) DEFAULT 0,

    -- Settings
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_referral_links_referrer_id ON referral_links(referrer_id);
CREATE INDEX idx_referral_links_short_code ON referral_links(short_code);
CREATE INDEX idx_referral_links_is_active ON referral_links(is_active);

-- Click tracking for referral links
CREATE TABLE IF NOT EXISTS referral_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id UUID REFERENCES referral_links(id) ON DELETE CASCADE,
    referral_code VARCHAR(20),

    -- Click data
    ip_address INET,
    user_agent TEXT,
    referer TEXT,
    device_type VARCHAR(20),
    browser VARCHAR(50),
    os VARCHAR(50),
    country VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),

    -- Conversion tracking
    converted BOOLEAN DEFAULT false,
    converted_at TIMESTAMP WITH TIME ZONE,
    referral_id UUID REFERENCES referrals(id),

    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_referral_clicks_link_id ON referral_clicks(link_id);
CREATE INDEX idx_referral_clicks_referral_code ON referral_clicks(referral_code);
CREATE INDEX idx_referral_clicks_clicked_at ON referral_clicks(clicked_at DESC);

-- Referral tier requirements
CREATE TABLE IF NOT EXISTS referral_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_name VARCHAR(20) UNIQUE NOT NULL,
    tier_level INTEGER UNIQUE NOT NULL,

    -- Requirements
    min_referrals INTEGER NOT NULL,
    min_qualified_referrals INTEGER NOT NULL,
    min_monthly_referrals INTEGER DEFAULT 0,
    min_earnings DECIMAL(10,2) DEFAULT 0,

    -- Benefits
    commission_rate DECIMAL(5,4) NOT NULL,
    bonus_amount DECIMAL(10,2) DEFAULT 0,
    perks JSONB, -- Array of perk descriptions

    -- Display
    badge_color VARCHAR(20),
    badge_icon VARCHAR(50),
    description TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default tiers
INSERT INTO referral_tiers (tier_name, tier_level, min_referrals, min_qualified_referrals, commission_rate, bonus_amount, badge_color) VALUES
    ('bronze', 1, 0, 0, 0.05, 50.00, 'orange'),
    ('silver', 2, 10, 5, 0.075, 75.00, 'gray'),
    ('gold', 3, 25, 15, 0.10, 100.00, 'yellow'),
    ('platinum', 4, 50, 30, 0.15, 150.00, 'purple')
ON CONFLICT (tier_name) DO NOTHING;

-- Referral rewards and bonuses
CREATE TABLE IF NOT EXISTS referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE,

    -- Reward details
    reward_type VARCHAR(50) NOT NULL, -- signup_bonus, referral_commission, tier_bonus, contest_prize
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    -- Status values: pending, approved, paid, cancelled, reversed

    -- Payment details
    payment_method VARCHAR(50), -- cash_app, ach, check, gift_card
    payment_id UUID REFERENCES payments(id),
    paid_at TIMESTAMP WITH TIME ZONE,

    -- Conditions
    conditions_met BOOLEAN DEFAULT false,
    qualification_date DATE,
    expiration_date DATE,

    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_referral_rewards_referrer_id ON referral_rewards(referrer_id);
CREATE INDEX idx_referral_rewards_referral_id ON referral_rewards(referral_id);
CREATE INDEX idx_referral_rewards_status ON referral_rewards(status);
CREATE INDEX idx_referral_rewards_reward_type ON referral_rewards(reward_type);

-- Referral notifications
CREATE TABLE IF NOT EXISTS referral_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Notification details
    type VARCHAR(50) NOT NULL, -- new_referral, referral_qualified, payment_sent, tier_upgrade
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,

    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,

    -- Delivery
    email_sent BOOLEAN DEFAULT false,
    sms_sent BOOLEAN DEFAULT false,
    push_sent BOOLEAN DEFAULT false,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_referral_notifications_user_id ON referral_notifications(user_id);
CREATE INDEX idx_referral_notifications_is_read ON referral_notifications(is_read);
CREATE INDEX idx_referral_notifications_created_at ON referral_notifications(created_at DESC);

-- Create triggers for updated_at
CREATE TRIGGER update_referral_profiles_updated_at BEFORE UPDATE ON referral_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON referrals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referral_links_updated_at BEFORE UPDATE ON referral_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referral_rewards_updated_at BEFORE UPDATE ON referral_rewards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for referral analytics
CREATE VIEW referral_analytics AS
SELECT
    rp.user_id,
    rp.referral_code,
    rp.tier,
    COUNT(DISTINCT r.id) as total_referrals,
    COUNT(DISTINCT CASE WHEN r.status = 'qualified' THEN r.id END) as qualified_referrals,
    COUNT(DISTINCT CASE WHEN r.created_at > NOW() - INTERVAL '30 days' THEN r.id END) as monthly_referrals,
    SUM(rr.amount) FILTER (WHERE rr.status = 'paid') as total_earnings,
    MAX(r.created_at) as last_referral_date,
    AVG(CASE WHEN r.status = 'qualified' THEN 1 ELSE 0 END) as conversion_rate
FROM referral_profiles rp
LEFT JOIN referrals r ON rp.user_id = r.referrer_id
LEFT JOIN referral_rewards rr ON rp.user_id = rr.referrer_id
GROUP BY rp.user_id, rp.referral_code, rp.tier;

-- Create view for referral leaderboard
CREATE VIEW referral_leaderboard AS
SELECT
    rp.display_name,
    rp.avatar_url,
    rp.tier,
    rp.total_referrals,
    rp.total_earnings,
    RANK() OVER (ORDER BY rp.total_referrals DESC) as referral_rank,
    RANK() OVER (ORDER BY rp.total_earnings DESC) as earnings_rank
FROM referral_profiles rp
WHERE rp.is_active = true AND rp.is_public = true
ORDER BY rp.total_referrals DESC
LIMIT 100;