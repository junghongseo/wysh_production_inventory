-- Supabase Migration and Seed Data SQL Script
-- Project: WYSH Production & Inventory System

-- =========================================================================
-- 1. Table Definitions
-- =========================================================================

-- A. Products Table
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    weight INTEGER NOT NULL,
    yield INTEGER NOT NULL,
    color TEXT NOT NULL,
    ingredients JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- B. Production Plans Table
CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    bottling_date DATE NOT NULL,
    shipping_limit DATE NOT NULL,
    expiry_date DATE NOT NULL,
    avg_order_qty INTEGER NOT NULL,
    marketing_qty INTEGER NOT NULL,
    buffer_qty INTEGER NOT NULL,
    total_qty INTEGER NOT NULL,
    fermenter_type TEXT NOT NULL,
    total_volume_l NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- C. Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
    plan_id TEXT PRIMARY KEY REFERENCES plans(id) ON DELETE CASCADE,
    actual_qty INTEGER NOT NULL,
    history JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- =========================================================================
-- 2. Row Level Security (RLS) & Policies
-- =========================================================================

-- Enable RLS for all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Products Policies (Anon access)
CREATE POLICY "Allow public read access to products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow public write access to products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to products" ON products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access to products" ON products FOR DELETE USING (true);

-- Plans Policies (Anon access)
CREATE POLICY "Allow public read access to plans" ON plans FOR SELECT USING (true);
CREATE POLICY "Allow public write access to plans" ON plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to plans" ON plans FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access to plans" ON plans FOR DELETE USING (true);

-- Inventory Policies (Anon access)
CREATE POLICY "Allow public read access to inventory" ON inventory FOR SELECT USING (true);
CREATE POLICY "Allow public write access to inventory" ON inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to inventory" ON inventory FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access to inventory" ON inventory FOR DELETE USING (true);


-- =========================================================================
-- 3. Mock Seed Data (Initial Mock Data Setup)
-- =========================================================================

-- Seed Products
INSERT INTO products (id, name, weight, yield, color, ingredients) VALUES
('prod-1', '그릭 요거트 플레인', 150, 28, 'blue', '[{"name": "원유", "ratio": 95}, {"name": "유산균", "ratio": 5}]'::jsonb),
('prod-2', '블루베리 그릭 요거트', 130, 30, 'purple', '[{"name": "원유", "ratio": 80}, {"name": "블루베리 퓨레", "ratio": 18}, {"name": "유산균", "ratio": 2}]'::jsonb),
('prod-3', '딸기 그릭 요거트', 130, 30, 'pink', '[{"name": "원유", "ratio": 80}, {"name": "딸기 잼", "ratio": 18}, {"name": "유산균", "ratio": 2}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Seed Plans
INSERT INTO plans (id, name, product_id, start_date, bottling_date, shipping_limit, expiry_date, avg_order_qty, marketing_qty, buffer_qty, total_qty, fermenter_type, total_volume_l) VALUES
('P-20260708-01', '7월 1주차 플레인 생산', 'prod-1', '2026-07-08', '2026-07-10', '2026-07-17', '2026-07-29', 100, 50, 50, 800, 'large', 428.57),
('P-20260713-01', '7월 2주차 블루베리 생산', 'prod-2', '2026-07-13', '2026-07-15', '2026-07-22', '2026-08-06', 300, 110, 100, 2310, 'large', 1001.00)
ON CONFLICT (id) DO NOTHING;

-- Seed Inventory
INSERT INTO inventory (plan_id, actual_qty, history) VALUES
('P-20260708-01', 800, '[{"id": "h-1", "date": "2026-07-10 10:00", "qty": 150, "purpose": "출고"}, {"id": "h-2", "date": "2026-07-10 14:00", "qty": 20, "purpose": "마케팅 활용"}]'::jsonb),
('P-20260713-01', 2310, '[]'::jsonb)
ON CONFLICT (plan_id) DO NOTHING;
