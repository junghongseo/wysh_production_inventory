-- =====================================================================
-- 2-A: 배합 데이터 · 배너 설정 분리 (추가만, 기존 데이터 변경 없음)
--
-- - product_recipes: 배합 비율·레시피 메모·부자재 구성. 처음부터 권한자만 읽기.
--   products 에 쓰면 트리거가 자동으로 복사한다 (예전 앱과 새 앱 모두 동기화).
--   2-B 에서 트리거를 "복사 후 products 쪽 값 비우기"로 바꾼다.
-- - app_settings: 배너 설정. 로그인 사용자 읽기, 관리자만 쓰기.
--   기존 calendar_notes '__banner_settings__' 행은 2-B 까지 그대로 둔다.
-- =====================================================================

-- 1. 배합 데이터 읽기 권한 (src/utils/permissions.js canReadRecipeData 와 같은 규칙)
CREATE OR REPLACE FUNCTION public.can_read_recipes()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_permission('calendar.recipe')
      OR public.has_permission('menu.recipes')
      OR public.has_permission('calendar.plans');
$$;
REVOKE ALL ON FUNCTION public.can_read_recipes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_recipes() TO authenticated;

-- 2. product_recipes -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_recipes (
  product_id text PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  ingredients jsonb,
  recipe_memo text,
  packaging jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_recipes FROM anon;

DROP POLICY IF EXISTS "product_recipes_select" ON public.product_recipes;
CREATE POLICY "product_recipes_select" ON public.product_recipes
  FOR SELECT TO authenticated USING (public.can_read_recipes());

DROP POLICY IF EXISTS "product_recipes_write" ON public.product_recipes;
CREATE POLICY "product_recipes_write" ON public.product_recipes
  FOR ALL TO authenticated
  USING (public.has_permission('menu.recipes'))
  WITH CHECK (public.has_permission('menu.recipes'));

-- products 에 배합 데이터가 쓰이면 product_recipes 로 복사 (권한과 무관하게 동작하도록 SECURITY DEFINER)
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

-- 트리거 전용 함수: API 로 직접 호출할 수 없게 한다
REVOKE ALL ON FUNCTION public.sync_product_recipe() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_product_recipe_ins ON public.products;
CREATE TRIGGER sync_product_recipe_ins
  AFTER INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_recipe();

DROP TRIGGER IF EXISTS sync_product_recipe_upd ON public.products;
CREATE TRIGGER sync_product_recipe_upd
  AFTER UPDATE ON public.products
  FOR EACH ROW
  WHEN (NEW.ingredients IS DISTINCT FROM OLD.ingredients
     OR NEW.recipe_memo IS DISTINCT FROM OLD.recipe_memo
     OR NEW.packaging IS DISTINCT FROM OLD.packaging)
  EXECUTE FUNCTION public.sync_product_recipe();

-- 기존 데이터 복사
INSERT INTO public.product_recipes (product_id, ingredients, recipe_memo, packaging)
SELECT id, ingredients, recipe_memo, packaging FROM public.products
ON CONFLICT (product_id) DO NOTHING;

-- 3. app_settings ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_settings FROM anon;

DROP POLICY IF EXISTS "app_settings_select" ON public.app_settings;
CREATE POLICY "app_settings_select" ON public.app_settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "app_settings_write" ON public.app_settings;
CREATE POLICY "app_settings_write" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 기존 배너 설정 복사
INSERT INTO public.app_settings (key, value)
SELECT 'banner', content::jsonb FROM public.calendar_notes
WHERE date_str = '__banner_settings__' AND content IS NOT NULL
ON CONFLICT (key) DO NOTHING;

-- 4. 실시간 반영 ----------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'product_recipes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.product_recipes;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'app_settings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
  END IF;
END $$;
