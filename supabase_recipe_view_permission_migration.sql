-- 배합표 보기 권한(calendar.recipe) 추가: 캘린더 메뉴 아래 기능 권한.
-- src/utils/permissions.js 의 FEATURE_PERMISSIONS 와 같은 규칙을 유지한다.
CREATE OR REPLACE FUNCTION public.permission_parent(p text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p
    WHEN 'calendar.recipe'  THEN 'menu.calendar'
    WHEN 'calendar.plans'   THEN 'menu.calendar'
    WHEN 'calendar.notes'   THEN 'menu.calendar'
    WHEN 'inventory.verify' THEN 'menu.inventory'
    WHEN 'reports.confirm'  THEN 'menu.reports'
    WHEN 'recipes.cost'     THEN 'menu.recipes'
    ELSE NULL
  END;
$$;
