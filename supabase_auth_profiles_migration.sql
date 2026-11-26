-- =====================================================================
-- 개인 계정 + 권한 관리 (1단계)
-- Supabase SQL Editor에서 실행하세요.
--
-- 이 마이그레이션은 기존 테이블의 RLS 정책을 바꾸지 않습니다.
-- (기존 테이블 잠금은 2단계 마이그레이션에서 진행)
--
-- 실행 전 Supabase 대시보드 설정:
--   Authentication > Sign In / Providers > Email
--     - "Allow new users to sign up"  : 끔 (관리자만 계정 생성)
--     - "Confirm email"               : 끔 (가짜 이메일 아이디@wysh.local 사용)
-- =====================================================================

-- 1. 프로필 테이블 -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9._]{3,20}$'),
  display_name text NOT NULL CHECK (length(trim(display_name)) > 0),
  is_admin boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT true,
  permissions text[] NOT NULL DEFAULT '{}',
  last_seen_at timestamptz,
  last_app_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. 권한 확인 함수 (2단계 RLS에서도 사용) -------------------------------
-- 기능 권한은 상위 메뉴 권한이 있어야 유효하다. src/utils/permissions.js 와 같은 규칙.
CREATE OR REPLACE FUNCTION public.permission_parent(p text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE p
    WHEN 'calendar.plans'   THEN 'menu.calendar'
    WHEN 'calendar.notes'   THEN 'menu.calendar'
    WHEN 'inventory.verify' THEN 'menu.inventory'
    WHEN 'reports.confirm'  THEN 'menu.reports'
    WHEN 'recipes.cost'     THEN 'menu.recipes'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin AND is_active
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(p text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_active
      AND (
        is_admin
        OR (
          p = ANY(permissions)
          AND (public.permission_parent(p) IS NULL OR public.permission_parent(p) = ANY(permissions))
        )
      )
  );
$$;

-- 3. 관리자 잠금 방지 트리거 ---------------------------------------------
CREATE OR REPLACE FUNCTION public.profiles_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.username <> OLD.username THEN
    RAISE EXCEPTION '아이디는 변경할 수 없습니다.';
  END IF;

  IF OLD.id = auth.uid() AND OLD.is_admin AND NOT NEW.is_admin THEN
    RAISE EXCEPTION '자기 자신의 관리자 권한은 해제할 수 없습니다.';
  END IF;

  IF OLD.id = auth.uid() AND OLD.is_active AND NOT NEW.is_active THEN
    RAISE EXCEPTION '자기 자신의 계정은 비활성화할 수 없습니다.';
  END IF;

  IF OLD.is_admin AND OLD.is_active AND (NOT NEW.is_admin OR NOT NEW.is_active) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id <> OLD.id AND is_admin AND is_active
    ) THEN
      RAISE EXCEPTION '마지막 관리자는 해제하거나 비활성화할 수 없습니다.';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard ON public.profiles;
CREATE TRIGGER profiles_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard();

-- 4. 본인이 호출하는 함수 (일반 사용자는 profiles를 직접 수정할 수 없음) --
CREATE OR REPLACE FUNCTION public.touch_presence(p_version text)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET last_seen_at = now(), last_app_version = left(p_version, 64)
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.complete_password_change()
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles SET must_change_password = false WHERE id = auth.uid();
$$;

ALTER FUNCTION public.permission_parent(text) SET search_path = public;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;
REVOKE ALL ON FUNCTION public.touch_presence(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_password_change() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_presence(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_password_change() TO authenticated;

-- 5. profiles RLS -------------------------------------------------------
-- 로그인한 사용자는 모든 프로필을 읽을 수 있다 (작업자 이름 표시용).
-- 수정은 관리자만. 생성은 Edge Function(service role)만. 삭제는 하지 않는다(비활성화).
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6. 권한 변경 즉시 반영용 Realtime --------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

-- 7. 작업자 기록 컬럼 (과거 기록은 NULL 유지) ------------------------------
ALTER TABLE public.plans          ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.plans          ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.reports        ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.reports        ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.calendar_notes ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.calendar_notes ADD COLUMN IF NOT EXISTS updated_by uuid;
-- 출고 내역은 inventory.history(JSONB) 항목 안에 createdBy / verifiedBy 로 저장한다.

-- =====================================================================
-- 8. 첫 관리자 계정 만들기 (한 번만)
--   1) 대시보드 Authentication > Users > Add user > Create new user
--        Email: <아이디>@wysh.local   Password: <비밀번호>   Auto Confirm User: 체크
--   2) 아래 SQL의 <아이디>, <표시 이름>을 바꿔서 실행
--
-- INSERT INTO public.profiles (id, username, display_name, is_admin, must_change_password)
-- SELECT id, '<아이디>', '<표시 이름>', true, false
-- FROM auth.users WHERE email = '<아이디>@wysh.local';
-- =====================================================================
