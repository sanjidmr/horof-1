-- Marketing Campaigns and Offers Tables
-- This migration creates tables for managing marketing campaigns and promotional offers

-- Create marketing_campaigns table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'scheduled', 'ended', 'draft')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  budget DECIMAL(10, 2) DEFAULT 0,
  spent DECIMAL(10, 2) DEFAULT 0,
  description TEXT,
  target_audience TEXT NOT NULL DEFAULT 'all',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create marketing_offers table
CREATE TABLE IF NOT EXISTS marketing_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'percentage' CHECK (type IN ('percentage', 'fixed', 'free_shipping', 'bogo')),
  value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  min_purchase DECIMAL(10, 2) DEFAULT 0,
  max_uses INTEGER DEFAULT 0,
  used_count INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'scheduled', 'expired')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_dates ON marketing_campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_marketing_offers_code ON marketing_offers(code);
CREATE INDEX IF NOT EXISTS idx_marketing_offers_status ON marketing_offers(status);
CREATE INDEX IF NOT EXISTS idx_marketing_offers_dates ON marketing_offers(start_date, end_date);

-- Insert some sample data (optional - can be removed in production)
-- INSERT INTO marketing_campaigns (name, type, status, start_date, end_date, budget, description, target_audience)
-- VALUES 
--   ('Summer Sale 2024', 'seasonal', 'active', '2024-06-01', '2024-08-31', 50000, 'Annual summer sale campaign', 'all'),
--   ('New Customer Welcome', 'brand_awareness', 'active', '2024-01-01', '2024-12-31', 10000, 'Welcome offer for new customers', 'new');

-- INSERT INTO marketing_offers (name, code, type, value, min_purchase, max_uses, start_date, end_date, status, description)
-- VALUES 
--   ('Summer Discount', 'SUMMER24', 'percentage', 20, 1000, 1000, '2024-06-01', '2024-08-31', 'active', '20% off on all products'),
--   ('Free Shipping', 'FREESHIP', 'free_shipping', 0, 500, 0, '2024-01-01', '2024-12-31', 'active', 'Free shipping on orders above ৳500');

-- Enable Row Level Security (RLS)
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_offers ENABLE ROW LEVEL SECURITY;

-- Create policies for marketing_campaigns
CREATE POLICY "Allow public read access to campaigns" ON marketing_campaigns
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert campaigns" ON marketing_campaigns
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update campaigns" ON marketing_campaigns
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete campaigns" ON marketing_campaigns
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create policies for marketing_offers
CREATE POLICY "Allow public read access to offers" ON marketing_offers
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert offers" ON marketing_offers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update offers" ON marketing_offers
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete offers" ON marketing_offers
  FOR DELETE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON marketing_campaigns TO authenticated;
GRANT ALL ON marketing_offers TO authenticated;
GRANT SELECT ON marketing_campaigns TO anon;
GRANT SELECT ON marketing_offers TO anon;