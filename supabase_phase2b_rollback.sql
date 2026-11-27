-- =====================================================================
-- 2-B 되돌리기: 문제가 생기면 즉시 실행해 2-B 이전(누구나 읽기·쓰기)으로 돌린다.
--
-- - 새 정책·보호 트리거 삭제, 예전 "Allow public ..." 정책 복구, anon 권한 복구
-- - 배합 복사 트리거를 2-A 방식(AFTER, products 값 유지)으로 복구하고
--   products 배합 필드를 product_recipes 의 현재 값으로 다시 채움
-- - chat_history.user_id 컬럼은 남겨 둔다 (있어도 예전 앱 동작에 영향 없음)
-- =====================================================================

BEGIN;

-- 1. 새 정책 삭제 + 예전 정책 복구 -----------------------------------------
DO $$
DECLARE
  t text;
  pol record;
BEGIN
  FOREACH t IN ARRAY ARRAY['products','plans','inventory','calendar_notes','reports','shipping_charts','material_costs','chat_history','events','sales_history']
  LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
    END LOOP;
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO public USING (true)', 'Allow public read access to ' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO public WITH CHECK (true)', 'Allow public write access to ' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO public USING (true) WITH CHECK (true)', 'Allow public update access to ' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO public USING (true)', 'Allow public delete access to ' || t, t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS app_settings_select ON public.app_settings;
CREATE POLICY app_settings_select ON public.app_settings FOR SELECT TO authenticated USING (true);

-- 2. 보호 트리거 삭제 --------------------------------------------------------
DROP TRIGGER IF EXISTS guard_inventory_history ON public.inventory;
DROP TRIGGER IF EXISTS guard_report_confirm ON public.reports;

-- 3. 배합 복사 트리거를 2-A 방식으로 ---------------------------------------
DROP TRIGGER IF EXISTS zz_sync_product_recipe ON public.products;

CREATE OR REPLACE FUNCTION public.sync_product_recipe()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ingredients IS NULL AND NEW.recipe_memo IS NULL AND NEW.packaging IS NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.product_recipes (product_id, ingredients, recipe_memo, packaging, updated_at)
  VALUES (NEW.id, NEW.ingredients, NEW.recipe_memo, NEW.packaging, now())
  ON CONFLICT (product_id) DO UPDATE SET
    ingredients = COALESCE(EXCLUDED.ingredients, public.product_recipes.ingredients),
    recipe_memo = COALESCE(EXCLUDED.recipe_memo, public.product_recipes.recipe_memo),
    packaging   = COALESCE(EXCLUDED.packaging, public.product_recipes.packaging),
    updated_at  = now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_product_recipe() FROM PUBLIC, anon, authenticated;

-- products 배합 값 복구 (트리거를 다시 만들기 전에 채워서 불필요한 복사를 피한다)
UPDATE public.products p
SET ingredients = r.ingredients, recipe_memo = r.recipe_memo, packaging = r.packaging
FROM public.product_recipes r
WHERE r.product_id = p.id;

CREATE TRIGGER sync_product_recipe_ins
  AFTER INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_recipe();

CREATE TRIGGER sync_product_recipe_upd
  AFTER UPDATE ON public.products
  FOR EACH ROW
  WHEN (NEW.ingredients IS DISTINCT FROM OLD.ingredients
     OR NEW.recipe_memo IS DISTINCT FROM OLD.recipe_memo
     OR NEW.packaging IS DISTINCT FROM OLD.packaging)
  EXECUTE FUNCTION public.sync_product_recipe();

ALTER TABLE public.product_recipes DROP CONSTRAINT IF EXISTS product_recipes_product_id_fkey;
ALTER TABLE public.product_recipes ADD CONSTRAINT product_recipes_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

COMMIT;

-- 배너 예전 행은 복구하지 않는다: 지금 앱은 app_settings 만 읽는다.
