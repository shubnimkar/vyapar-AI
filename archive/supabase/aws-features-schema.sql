-- AWS Hackathon Features Schema Extensions
-- Run this migration to add tables for voice uploads, reports, and user preferences

-- Voice uploads tracking table
CREATE TABLE IF NOT EXISTS voice_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  s3_key VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'processing',
  extracted_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_voice_uploads_user ON voice_uploads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_uploads_status ON voice_uploads(status);

-- Daily reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_sales DECIMAL(10, 2),
  total_expenses DECIMAL(10, 2),
  net_profit DECIMAL(10, 2),
  top_expense_categories JSONB,
  insights TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_user_date ON reports(user_id, date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_user_date_unique ON reports(user_id, date);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY,
  automation_enabled BOOLEAN DEFAULT true,
  report_time TIME DEFAULT '20:00:00',
  language VARCHAR(5) DEFAULT 'hi',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for security
ALTER TABLE voice_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Voice uploads policies
CREATE POLICY IF NOT EXISTS "Users can view own voice uploads"
  ON voice_uploads FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY IF NOT EXISTS "Users can insert own voice uploads"
  ON voice_uploads FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

-- Reports policies
CREATE POLICY IF NOT EXISTS "Users can view own reports"
  ON reports FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY IF NOT EXISTS "Service role can insert reports"
  ON reports FOR INSERT
  WITH CHECK (true);

-- User preferences policies
CREATE POLICY IF NOT EXISTS "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY IF NOT EXISTS "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (user_id::text = auth.uid()::text);

CREATE POLICY IF NOT EXISTS "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

-- Comments for documentation
COMMENT ON TABLE voice_uploads IS 'Tracks voice recording uploads and processing status';
COMMENT ON TABLE reports IS 'Stores automated daily business reports';
COMMENT ON TABLE user_preferences IS 'User settings for automation and preferences';
