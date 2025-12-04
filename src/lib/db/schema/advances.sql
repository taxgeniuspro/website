-- Cash Advance Applications Schema
-- Story 1.2: Cash Advance Application Flow

-- Main advances table
CREATE TABLE IF NOT EXISTS advances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Application amounts
    amount DECIMAL(10,2) NOT NULL,
    requested_amount DECIMAL(10,2) NOT NULL,
    estimated_refund DECIMAL(10,2),

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- Status values: pending, processing, approved, declined, funded, repaid

    -- Application data (JSON for flexibility)
    application_data JSONB NOT NULL,
    -- Contains: personal info, income details, employment data

    -- Decision data
    decision_data JSONB,
    -- Contains: approval amount, decline reason, risk score

    -- Documents
    documents JSONB,
    -- Contains: w2_files, 1099_files, id_file URLs

    -- Timestamps
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    decided_at TIMESTAMP WITH TIME ZONE,
    funded_at TIMESTAMP WITH TIME ZONE,
    repaid_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    ip_address INET,
    user_agent TEXT,
    referrer_code VARCHAR(50),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_advances_user_id ON advances(user_id);
CREATE INDEX idx_advances_status ON advances(status);
CREATE INDEX idx_advances_applied_at ON advances(applied_at DESC);
CREATE INDEX idx_advances_referrer_code ON advances(referrer_code);

-- Advance payments tracking
CREATE TABLE IF NOT EXISTS advance_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advance_id UUID REFERENCES advances(id) ON DELETE CASCADE,

    -- Payment details
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(20) NOT NULL, -- disbursement, repayment, fee
    method VARCHAR(50), -- ach, wire, cash_app

    -- Transaction info
    transaction_id VARCHAR(255),
    processor VARCHAR(50), -- square, stripe, etc
    processor_response JSONB,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- Status values: pending, processing, completed, failed, reversed

    -- Banking info (encrypted)
    routing_number_encrypted TEXT,
    account_last_four VARCHAR(4),

    -- Timestamps
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for payment lookups
CREATE INDEX idx_advance_payments_advance_id ON advance_payments(advance_id);
CREATE INDEX idx_advance_payments_status ON advance_payments(status);

-- Document uploads tracking
CREATE TABLE IF NOT EXISTS advance_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advance_id UUID REFERENCES advances(id) ON DELETE CASCADE,

    -- Document info
    type VARCHAR(50) NOT NULL, -- w2, 1099, id, bank_statement
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),

    -- OCR/Processing results
    extracted_data JSONB,
    verification_status VARCHAR(20) DEFAULT 'pending',
    -- Status values: pending, verified, rejected, manual_review

    -- Metadata
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for document lookups
CREATE INDEX idx_advance_documents_advance_id ON advance_documents(advance_id);
CREATE INDEX idx_advance_documents_type ON advance_documents(type);

-- Risk assessment scores
CREATE TABLE IF NOT EXISTS advance_risk_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advance_id UUID REFERENCES advances(id) ON DELETE CASCADE,

    -- Risk metrics
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    income_verification_score INTEGER,
    identity_verification_score INTEGER,
    document_verification_score INTEGER,

    -- Risk factors
    risk_factors JSONB,
    -- Contains: missing_documents, income_mismatch, identity_issues, etc

    -- Decision
    recommendation VARCHAR(20), -- approve, decline, manual_review
    recommended_amount DECIMAL(10,2),

    -- Metadata
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    model_version VARCHAR(20),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for risk score lookups
CREATE INDEX idx_advance_risk_scores_advance_id ON advance_risk_scores(advance_id);

-- Application status history for audit trail
CREATE TABLE IF NOT EXISTS advance_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advance_id UUID REFERENCES advances(id) ON DELETE CASCADE,

    -- Status change
    from_status VARCHAR(20),
    to_status VARCHAR(20) NOT NULL,
    reason TEXT,

    -- Who made the change
    changed_by UUID REFERENCES users(id),
    changed_by_type VARCHAR(20), -- user, system, admin

    -- When
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for history lookups
CREATE INDEX idx_advance_status_history_advance_id ON advance_status_history(advance_id);
CREATE INDEX idx_advance_status_history_changed_at ON advance_status_history(changed_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for advances table
CREATE TRIGGER update_advances_updated_at BEFORE UPDATE ON advances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for advance analytics
CREATE VIEW advance_analytics AS
SELECT
    DATE_TRUNC('day', applied_at) as application_date,
    COUNT(*) as total_applications,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
    COUNT(CASE WHEN status = 'declined' THEN 1 END) as declined_count,
    COUNT(CASE WHEN status = 'funded' THEN 1 END) as funded_count,
    AVG(CASE WHEN status = 'approved' THEN amount END) as avg_approved_amount,
    SUM(CASE WHEN status = 'funded' THEN amount END) as total_funded
FROM advances
GROUP BY DATE_TRUNC('day', applied_at)
ORDER BY application_date DESC;

-- Create view for user advance summary
CREATE VIEW user_advance_summary AS
SELECT
    u.id as user_id,
    u.email,
    COUNT(a.id) as total_advances,
    SUM(CASE WHEN a.status = 'funded' THEN a.amount ELSE 0 END) as total_funded,
    SUM(CASE WHEN a.status = 'repaid' THEN a.amount ELSE 0 END) as total_repaid,
    MAX(a.applied_at) as last_application_date
FROM users u
LEFT JOIN advances a ON u.id = a.user_id
GROUP BY u.id, u.email;