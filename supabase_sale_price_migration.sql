-- Supabase Migration SQL Script for Product Sale Price
-- Run this in Supabase SQL Editor to enable sale_price column in products table
-- 제품 판매가 (VAT 포함, 원). 원가율 계산에 사용

ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price NUMERIC;
