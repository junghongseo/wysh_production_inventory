-- =====================================================================
-- 2-B: 기존 테이블 DB 잠금 (영업 종료 후, supabase_phase2b_backup.sql 다음에 실행)
--
-- 1. 로그인하지 않은 접근(anon) 전부 차단, 비활성 계정도 차단
-- 2. 쓰기는 권한별로 제한 (src/utils/permissions.js 와 같은 규칙)
-- 3. 배합 비율을 products 에서 지우고, 앞으로도 products 에 남지 않게
-- 4. 출고 검증·취소, 보고서 확인은 트리거로 권한 확인
-- 5. AI 대화 기록은 본인 것만
-- 6. calendar_notes 의 예전 배너 행 정리
--
-- 문제가 생기면 supabase_phase2b_rollback.sql 로 바로 되돌린다.
-- =====================================================================

BEGIN;

-- 0. 활성 팀원인지 -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_active_member()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active);
$$;
REVOKE ALL ON FUNCTION public.is_active_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_member() TO authenticated;

-- 1. 예전 "누구나" 정책 삭제 + anon 권한 회수 ------------------------------
DO $$
DECLARE
  t text;
  pol record;
BEGIN
  FOREACH t IN ARRAY ARRAY['products','plans','inventory','calendar_notes','reports','shipping_charts','material_costs','chat_history','events','sales_history']
  LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname LIKE 'Allow public %'
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END $$;

REVOKE ALL ON public.profiles, public.product_recipes, public.app_settings FROM anon;

-- 2. 정책 ------------------------------------------------------------------
-- 읽기: 활성 팀원 누구나 (화면끼리 서로 데이터를 참조하므로). 민감 데이터만 따로 제한.

-- products (배합 필드는 아래 3번에서 비움)
CREATE POLICY products_select ON public.products FOR SELECT TO authenticated USING (public.is_active_member());
CREATE POLICY products_insert ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_permission('menu.recipes'));
CREATE POLICY products_update ON public.products FOR UPDATE TO authenticated USING (public.has_permission('menu.recipes')) WITH CHECK (public.has_permission('menu.recipes'));
CREATE POLICY products_delete ON public.products FOR DELETE TO authenticated USING (public.has_permission('menu.recipes'));

-- plans
CREATE POLICY plans_select ON public.plans FOR SELECT TO authenticated USING (public.is_active_member());
CREATE POLICY plans_insert ON public.plans FOR INSERT TO authenticated WITH CHECK (public.has_permission('calendar.plans'));
CREATE POLICY plans_update ON public.plans FOR UPDATE TO authenticated USING (public.has_permission('calendar.plans')) WITH CHECK (public.has_permission('calendar.plans'));
CREATE POLICY plans_delete ON public.plans FOR DELETE TO authenticated USING (public.has_permission('calendar.plans'));

-- inventory: 출고 등록(재고), 병입 수량 반영(보고서), 계획 등록·수정 때 재고 행 생성(생산계획)
CREATE POLICY inventory_select ON public.inventory FOR SELECT TO authenticated USING (public.is_active_member());
CREATE POLICY inventory_insert ON public.inventory FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('menu.inventory') OR public.has_permission('menu.reports') OR public.has_permission('calendar.plans'));
CREATE POLICY inventory_update ON public.inventory FOR UPDATE TO authenticated
  USING (public.has_permission('menu.inventory') OR public.has_permission('menu.reports') OR public.has_permission('calendar.plans'))
  WITH CHECK (public.has_permission('menu.inventory') OR public.has_permission('menu.reports') OR public.has_permission('calendar.plans'));
CREATE POLICY inventory_delete ON public.inventory FOR DELETE TO authenticated USING (public.has_permission('calendar.plans'));

-- calendar_notes
CREATE POLICY calendar_notes_select ON public.calendar_notes FOR SELECT TO authenticated USING (public.is_active_member());
CREATE POLICY calendar_notes_insert ON public.calendar_notes FOR INSERT TO authenticated WITH CHECK (public.has_permission('calendar.notes'));
CREATE POLICY calendar_notes_update ON public.calendar_notes FOR UPDATE TO authenticated USING (public.has_permission('calendar.notes')) WITH CHECK (public.has_permission('calendar.notes'));
CREATE POLICY calendar_notes_delete ON public.calendar_notes FOR DELETE TO authenticated USING (public.has_permission('calendar.notes'));

-- reports: 작성·수정은 리포트 메뉴, 삭제는 확인 권한자만 (확인 처리는 아래 트리거)
CREATE POLICY reports_select ON public.reports FOR SELECT TO authenticated USING (public.is_active_member());
CREATE POLICY reports_insert ON public.reports FOR INSERT TO authenticated WITH CHECK (public.has_permission('menu.reports'));
CREATE POLICY reports_update ON public.reports FOR UPDATE TO authenticated USING (public.has_permission('menu.reports')) WITH CHECK (public.has_permission('menu.reports'));
CREATE POLICY reports_delete ON public.reports FOR DELETE TO authenticated USING (public.has_permission('reports.confirm'));

-- shipping_charts: 주문 메뉴만 읽기·쓰기 (주문 정보)
CREATE POLICY shipping_charts_all ON public.shipping_charts FOR ALL TO authenticated
  USING (public.has_permission('menu.orders')) WITH CHECK (public.has_permission('menu.orders'));

-- material_costs: 원가 권한만 읽기·쓰기
CREATE POLICY material_costs_all ON public.material_costs FOR ALL TO authenticated
  USING (public.has_permission('recipes.cost')) WITH CHECK (public.has_permission('recipes.cost'));

-- events: AI 매니저가 읽음. 쓰기는 관리자만 (현재 화면에서 쓰지 않음)
CREATE POLICY events_select ON public.events FOR SELECT TO authenticated USING (public.is_active_member());
CREATE POLICY events_write ON public.events FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- sales_history: 사용하지 않는 예전 테이블. 관리자만
CREATE POLICY sales_history_admin ON public.sales_history FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- app_settings: 읽기도 활성 팀원만
DROP POLICY IF EXISTS app_settings_select ON public.app_settings;
CREATE POLICY app_settings_select ON public.app_settings FOR SELECT TO authenticated USING (public.is_active_member());

-- 3. AI 대화 기록: 본인 것만 ------------------------------------------------
ALTER TABLE public.chat_history ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS chat_history_user_id_idx ON public.chat_history (user_id, created_at);

-- 예전 기록(작성자 모름)은 관리자만 볼 수 있다
CREATE POLICY chat_history_select ON public.chat_history FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (user_id IS NULL AND public.is_admin()));
CREATE POLICY chat_history_insert ON public.chat_history FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('ai.manager') AND user_id = auth.uid());
CREATE POLICY chat_history_update ON public.chat_history FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY chat_history_delete ON public.chat_history FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR (user_id IS NULL AND public.is_admin()));

-- 4. 배합 비율을 products 에서 지우기 --------------------------------------
-- product_recipes 로 복사한 뒤 products 쪽 값을 NULL 로 바꾸는 BEFORE 트리거.
-- 새 제품 INSERT 때는 product_recipes 행이 products 행보다 먼저 생기므로 외래키 검사를 커밋 시점으로 미룬다.
ALTER TABLE public.product_recipes DROP CONSTRAINT IF EXISTS product_recipes_product_id_fkey;
ALTER TABLE public.product_recipes ADD CONSTRAINT product_recipes_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

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
  NEW.ingredients := NULL;
  NEW.recipe_memo := NULL;
  NEW.packaging := NULL;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_product_recipe() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_product_recipe_ins ON public.products;
DROP TRIGGER IF EXISTS sync_product_recipe_upd ON public.products;
-- 이름을 zz_ 로 시작: BEFORE 트리거는 이름순으로 실행되므로 trigger_block_mock_products 가 먼저 걸러낸다
DROP TRIGGER IF EXISTS zz_sync_product_recipe ON public.products;
CREATE TRIGGER zz_sync_product_recipe
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_recipe();

UPDATE public.products SET ingredients = NULL, recipe_memo = NULL, packaging = NULL
WHERE ingredients IS NOT NULL OR recipe_memo IS NOT NULL OR packaging IS NOT NULL;

-- 5. 출고 검증 보호 ----------------------------------------------------------
-- 출고 내역은 inventory.history(JSONB 배열). 검증 권한이 없으면:
--   - 출고 항목 삭제(출고 취소) 불가
--   - 검증 상태 변경 불가
--   - 처음부터 검증된 항목 추가 불가
--   - 이미 검증된 항목 수정 불가 (메모만 가능)
CREATE OR REPLACE FUNCTION public.guard_inventory_history()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_h jsonb := CASE WHEN TG_OP = 'UPDATE' THEN COALESCE(OLD.history, '[]'::jsonb) ELSE '[]'::jsonb END;
  new_h jsonb := COALESCE(NEW.history, '[]'::jsonb);
BEGIN
  -- SQL 편집기·서비스 키(관리 작업)는 통과
  IF auth.uid() IS NULL OR public.has_permission('inventory.verify') THEN
    RETURN NEW;
  END IF;
  IF old_h IS NOT DISTINCT FROM new_h THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(old_h) o
    WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(new_h) n WHERE n->>'id' = o->>'id')
  ) THEN
    RAISE EXCEPTION '출고 취소는 출고 검증 권한이 필요합니다.' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(old_h) o
    JOIN jsonb_array_elements(new_h) n ON n->>'id' = o->>'id'
    WHERE COALESCE((o->>'verified')::boolean, true) IS DISTINCT FROM COALESCE((n->>'verified')::boolean, true)
       OR (COALESCE((o->>'verified')::boolean, true)
           AND (o - 'memo' - 'updatedBy' - 'updatedAt') IS DISTINCT FROM (n - 'memo' - 'updatedBy' - 'updatedAt'))
  ) THEN
    RAISE EXCEPTION '검증된 출고의 변경은 출고 검증 권한이 필요합니다.' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(new_h) n
    WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(old_h) o WHERE o->>'id' = n->>'id')
      AND COALESCE((n->>'verified')::boolean, true)
  ) THEN
    RAISE EXCEPTION '검증된 출고 등록은 출고 검증 권한이 필요합니다.' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_inventory_history() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_inventory_history ON public.inventory;
CREATE TRIGGER guard_inventory_history
  BEFORE INSERT OR UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.guard_inventory_history();

-- 6. 보고서 확인 보호 --------------------------------------------------------
-- 확인 상태(details.confirmed)를 바꾸려면 reports.confirm. 관능 보고서는 예외(리포트 메뉴면 가능).
CREATE OR REPLACE FUNCTION public.guard_report_confirm()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_c boolean := COALESCE((NEW.details->>'confirmed')::boolean, false);
  old_c boolean := CASE WHEN TG_OP = 'UPDATE' THEN COALESCE((OLD.details->>'confirmed')::boolean, false) ELSE false END;
BEGIN
  IF auth.uid() IS NULL OR public.has_permission('reports.confirm') THEN
    RETURN NEW;
  END IF;
  IF new_c IS NOT DISTINCT FROM old_c THEN
    RETURN NEW;
  END IF;
  IF NEW.type = 'sensory' AND (TG_OP = 'INSERT' OR OLD.type = 'sensory') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION '보고서 확인 처리는 보고서 확인 권한이 필요합니다.' USING ERRCODE = '42501';
END;
$$;
REVOKE ALL ON FUNCTION public.guard_report_confirm() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_report_confirm ON public.reports;
CREATE TRIGGER guard_report_confirm
  BEFORE INSERT OR UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.guard_report_confirm();

-- 7. 예전 배너 행 정리 (배너는 app_settings) -------------------------------
DELETE FROM public.calendar_notes WHERE date_str = '__banner_settings__';

COMMIT;
