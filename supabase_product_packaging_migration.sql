-- Supabase Migration SQL Script for Product Packaging (부자재 구성)
-- Run this in Supabase SQL Editor to enable packaging column in products table
-- 제품 1개에 들어가는 부자재 목록: [{ "materialId": "mat-...", "qty": 1 }]
-- 원가율 계산 시 원재료비 + 부자재비로 사용. NULL = 아직 설정 안 함

ALTER TABLE products ADD COLUMN IF NOT EXISTS packaging JSONB;
