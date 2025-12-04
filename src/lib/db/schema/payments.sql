-- Payment Processing and Commission Tracking Schema
-- Story 1.3: Payment Processing Integration

-- Main payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advance_id UUID REFERENCES advances(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Payment details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    type VARCHAR(20) NOT NULL, -- advance_disbursement, repayment, fee, refund
    method VARCHAR(50) NOT NULL, -- card, cash_app, ach, wire

    -- Square integration
    square_payment_id VARCHAR(255) UNIQUE,
    square_receipt_url TEXT,
    square_receipt_number VARCHAR(100),

    -- Card details (tokenized)
    card_last_four VARCHAR(4),
    card_brand VARCHAR(50), -- VISA, MASTERCARD, AMEX, DISCOVER
    card_token_encrypted TEXT, -- Encrypted payment token

    -- Bank details (for ACH)
    routing_number_encrypted TEXT,
    account_last_four VARCHAR(4),
    account_type VARCHAR(20), -- checking, savings

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- Status values: pending, processing, completed, failed, refunded, disputed

    -- Fees breakdown
    gross_amount DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) DEFAULT 0,
    processor_fee DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(10,2) NOT NULL,

    -- Metadata
    reference_number VARCHAR(100) UNIQUE DEFAULT gen_random_uuid()::text,
    description TEXT,
    ip_address INET,
    user_agent TEXT,

    -- Timestamps
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_payments_advance_id ON payments(advance_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_square_payment_id ON payments(square_payment_id);
CREATE INDEX idx_payments_reference_number ON payments(reference_number);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- Commission tracking for preparers
CREATE TABLE IF NOT EXISTS commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    preparer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    advance_id UUID REFERENCES advances(id) ON DELETE CASCADE,

    -- Commission details
    base_amount DECIMAL(10,2) NOT NULL, -- Amount commission is calculated on
    commission_rate DECIMAL(5,4) NOT NULL, -- Rate as decimal (0.10 = 10%)
    commission_amount DECIMAL(10,2) NOT NULL,

    -- Preparer tier at time of commission
    preparer_tier VARCHAR(20) NOT NULL, -- junior, senior, master
    tier_bonus_amount DECIMAL(10,2) DEFAULT 0,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- Status values: pending, approved, paid, reversed, cancelled

    -- Payment details
    payout_id UUID,
    payout_date DATE,
    payout_method VARCHAR(50), -- ach, check, cash_app

    -- Metadata
    calculation_data JSONB, -- Store calculation details
    notes TEXT,

    -- Timestamps
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for commission lookups
CREATE INDEX idx_commissions_payment_id ON commissions(payment_id);
CREATE INDEX idx_commissions_preparer_id ON commissions(preparer_id);
CREATE INDEX idx_commissions_advance_id ON commissions(advance_id);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_commissions_payout_date ON commissions(payout_date);

-- Payment methods stored for users
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Method details
    type VARCHAR(20) NOT NULL, -- card, bank_account, cash_app
    is_default BOOLEAN DEFAULT false,
    nickname VARCHAR(100),

    -- Card details (tokenized)
    card_token_encrypted TEXT,
    card_last_four VARCHAR(4),
    card_brand VARCHAR(50),
    card_exp_month INTEGER,
    card_exp_year INTEGER,

    -- Bank details (encrypted)
    bank_routing_encrypted TEXT,
    bank_account_encrypted TEXT,
    bank_account_last_four VARCHAR(4),
    bank_account_type VARCHAR(20),
    bank_name VARCHAR(100),

    -- Cash App details
    cash_app_cashtag VARCHAR(50),

    -- Verification
    verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP WITH TIME ZONE,

    -- Status
    active BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for payment methods
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_type ON payment_methods(type);
CREATE INDEX idx_payment_methods_active ON payment_methods(active);

-- Payment batches for bulk processing
CREATE TABLE IF NOT EXISTS payment_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Batch details
    batch_type VARCHAR(50) NOT NULL, -- advance_disbursement, commission_payout
    batch_date DATE NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    payment_count INTEGER NOT NULL,

    -- Processing
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- Status values: pending, processing, completed, partial, failed

    -- Square batch info
    square_batch_id VARCHAR(255),
    square_batch_token VARCHAR(255),

    -- Results
    successful_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    processing_errors JSONB,

    -- Timestamps
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for payment batches
CREATE INDEX idx_payment_batches_batch_date ON payment_batches(batch_date);
CREATE INDEX idx_payment_batches_status ON payment_batches(status);
CREATE INDEX idx_payment_batches_batch_type ON payment_batches(batch_type);

-- Link payments to batches
CREATE TABLE IF NOT EXISTS payment_batch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES payment_batches(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,

    -- Item status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,

    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for batch items
CREATE INDEX idx_payment_batch_items_batch_id ON payment_batch_items(batch_id);
CREATE INDEX idx_payment_batch_items_payment_id ON payment_batch_items(payment_id);

-- Payment disputes/chargebacks
CREATE TABLE IF NOT EXISTS payment_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,

    -- Dispute details
    square_dispute_id VARCHAR(255),
    reason VARCHAR(100),
    dispute_amount DECIMAL(10,2) NOT NULL,
    dispute_state VARCHAR(50), -- inquiry, evidence_required, processing, won, lost

    -- Evidence
    evidence_submitted JSONB,
    evidence_due_date DATE,

    -- Resolution
    resolution VARCHAR(100),
    resolution_amount DECIMAL(10,2),

    -- Timestamps
    disputed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    evidence_submitted_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for disputes
CREATE INDEX idx_payment_disputes_payment_id ON payment_disputes(payment_id);
CREATE INDEX idx_payment_disputes_square_dispute_id ON payment_disputes(square_dispute_id);
CREATE INDEX idx_payment_disputes_dispute_state ON payment_disputes(dispute_state);

-- Create triggers for updated_at
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON commissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_batches_updated_at BEFORE UPDATE ON payment_batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_disputes_updated_at BEFORE UPDATE ON payment_disputes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for payment analytics
CREATE VIEW payment_analytics AS
SELECT
    DATE_TRUNC('day', created_at) as payment_date,
    type,
    COUNT(*) as transaction_count,
    SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as completed_amount,
    SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END) as failed_amount,
    SUM(platform_fee) as total_platform_fees,
    SUM(processor_fee) as total_processor_fees,
    AVG(CASE WHEN status = 'completed' THEN amount END) as avg_transaction_amount
FROM payments
GROUP BY DATE_TRUNC('day', created_at), type
ORDER BY payment_date DESC, type;

-- Create view for commission summary
CREATE VIEW commission_summary AS
SELECT
    p.id as preparer_id,
    p.email as preparer_email,
    COUNT(c.id) as total_commissions,
    SUM(CASE WHEN c.status = 'paid' THEN c.commission_amount ELSE 0 END) as total_paid,
    SUM(CASE WHEN c.status = 'pending' THEN c.commission_amount ELSE 0 END) as total_pending,
    AVG(c.commission_rate) as avg_commission_rate,
    MAX(c.earned_at) as last_commission_date
FROM users p
LEFT JOIN commissions c ON p.id = c.preparer_id
WHERE p.role = 'preparer'
GROUP BY p.id, p.email;