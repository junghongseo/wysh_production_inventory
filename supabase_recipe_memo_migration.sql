-- Supabase Migration SQL Script for Recipe Memo
-- Run this in Supabase SQL Editor to enable recipe_memo column in products table

ALTER TABLE products ADD COLUMN IF NOT EXISTS recipe_memo TEXT;
