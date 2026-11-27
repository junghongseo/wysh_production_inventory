-- =====================================================================
-- 2-B 적용 직전 백업 (잠금 SQL 보다 먼저 실행)
--
-- products 의 배합 필드는 2-B 에서 지워진다. 지우기 전 값을 그대로 복사해 둔다.
-- 이 테이블은 관리자만 SQL 편집기에서 볼 수 있다 (API 노출 차단).
-- 문제가 없다고 확인되면 몇 주 뒤 DROP 해도 된다.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.backup_products_recipe_20261128 AS
SELECT id, name, ingredients, recipe_memo, packaging, now() AS backed_up_at
FROM public.products;

ALTER TABLE public.backup_products_recipe_20261128 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.backup_products_recipe_20261128 FROM anon, authenticated;

-- 확인: products 의 배합 값이 product_recipes 와 모두 같아야 잠금으로 넘어간다 (결과 0행이어야 함)
SELECT p.id, p.name
FROM public.products p
LEFT JOIN public.product_recipes r ON r.product_id = p.id
WHERE (p.ingredients IS NOT NULL AND p.ingredients IS DISTINCT FROM r.ingredients)
   OR (p.recipe_memo IS NOT NULL AND p.recipe_memo IS DISTINCT FROM r.recipe_memo)
   OR (p.packaging IS NOT NULL AND p.packaging IS DISTINCT FROM r.packaging);
