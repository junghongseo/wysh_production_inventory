-- =========================================================================
-- AI 생산매니저 기능 지원을 위한 추가 테이블 생성 SQL
-- Supabase 대시보드 -> SQL Editor 에서 실행해주세요.
-- =========================================================================

-- 1. 이벤트 (달력 이벤트, 드랍 제품 출시일 등) 관리 테이블
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    event_date DATE NOT NULL,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    target_qty INTEGER DEFAULT 0,
    memo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS 활성화 및 권한 설정
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to events" ON events FOR SELECT USING (true);
CREATE POLICY "Allow public write access to events" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to events" ON events FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access to events" ON events FOR DELETE USING (true);


-- 2. AI 챗봇 과거 대화 내역 저장 (메모리 및 학습용) 테이블
CREATE TABLE IF NOT EXISTS chat_history (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL, -- 'user' 또는 'model'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS 활성화 및 권한 설정
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to chat_history" ON chat_history FOR SELECT USING (true);
CREATE POLICY "Allow public write access to chat_history" ON chat_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to chat_history" ON chat_history FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access to chat_history" ON chat_history FOR DELETE USING (true);


-- 3. 출고/판매 내역 전용 테이블 (판매 추이 분석용)
CREATE TABLE IF NOT EXISTS sales_history (
    id TEXT PRIMARY KEY,
    plan_id TEXT REFERENCES plans(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    qty INTEGER NOT NULL,
    purpose TEXT NOT NULL,
    shipping_date DATE NOT NULL,
    memo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS 활성화 및 권한 설정
ALTER TABLE sales_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to sales_history" ON sales_history FOR SELECT USING (true);
CREATE POLICY "Allow public write access to sales_history" ON sales_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to sales_history" ON sales_history FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access to sales_history" ON sales_history FOR DELETE USING (true);
