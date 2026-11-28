-- =====================================================================
-- DB 정리 (2026-11-29, 코드 점검 12번) — Supabase 보안·성능 점검(advisor) 경고 해소
--
-- 1. block_mock_products() 에 search_path 고정 (function_search_path_mutable 경고)
-- 2. chat_history 정책: auth.uid()·is_admin()·has_permission() 을 (select ...) 로 감싸
--    행마다 다시 계산하지 않고 쿼리당 한 번만 계산 (auth_rls_initplan 경고).
--    정책 이름과 조건은 그대로라 권한 동작은 바뀌지 않는다. supabase_phase2b_rollback.sql 과도 호환.
--
-- 하지 않는 것:
-- - backup_products_recipe_20261128 삭제: 2-B 적용(11-28) 후 몇 주 지켜본 뒤 따로 DROP 한다 (docs/phase2-handoff.md).
-- - 유출 비밀번호 차단: SQL 이 아니라 Supabase 대시보드 Authentication 설정에서 켠다.
-- =====================================================================

BEGIN;

-- 1. 트리거 함수 search_path 고정 (테이블을 참조하지 않으므로 동작 변화 없음)
ALTER FUNCTION public.block_mock_products() SET search_path = public;

-- 2. chat_history 정책 다시 만들기 (같은 이름·같은 조건)
DROP POLICY IF EXISTS chat_history_select ON public.chat_history;
DROP POLICY IF EXISTS chat_history_insert ON public.chat_history;
DROP POLICY IF EXISTS chat_history_update ON public.chat_history;
DROP POLICY IF EXISTS chat_history_delete ON public.chat_history;

CREATE POLICY chat_history_select ON public.chat_history FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR (user_id IS NULL AND (select public.is_admin())));
CREATE POLICY chat_history_insert ON public.chat_history FOR INSERT TO authenticated
  WITH CHECK ((select public.has_permission('ai.manager')) AND user_id = (select auth.uid()));
CREATE POLICY chat_history_update ON public.chat_history FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY chat_history_delete ON public.chat_history FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()) OR (user_id IS NULL AND (select public.is_admin())));

COMMIT;
