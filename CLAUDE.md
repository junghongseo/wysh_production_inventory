# Wyshboard

위시(WYSH) 생산·재고 관리 PWA. React 18 + Vite 5 (JSX, TypeScript 없음) + Supabase.
UI 텍스트와 사용자 응대는 한국어로 한다.

## 명령어
- `npm run dev` — 개발 서버 (http://localhost:3000)
- `npm run build` — 프로덕션 빌드 (`dist/`)
- `node src/utils/orderParser.test.js` / `node src/utils/recipeCalculator.test.js` / `node src/utils/permissions.test.js` — 테스트 (프레임워크 없이 node로 직접 실행)

계산·파싱 로직을 수정하면 위 테스트를 돌리고, 새 동작에는 같은 파일에 테스트 케이스를 추가한다.

## 구조
- `src/App.jsx` — 탭 라우팅(캘린더/재고/배합표/보고서/주문), 모달, PWA 배지
- `src/WyshContext.jsx` — 전역 상태 단일 소스. localStorage 즉시 저장 → Supabase push. Realtime 구독 + 10초 백그라운드 동기화
- `src/services/supabaseService.js` — Supabase CRUD, `storageService.js` — localStorage
- `src/utils/` — 순수 함수 (recipeCalculator, orderParser, stockUtils). UI와 분리 유지
- `src/components/` — 화면별 뷰, `modals/`, `reports/`, `recipes/` 등
- `supabase/functions/ai-manager/` — Gemini 기반 AI 매니저 Edge Function (Deno)
- `*.sql` (루트) — Supabase 마이그레이션. 스키마 변경 시 새 SQL 파일로 추가
- 테마: `src/index.css`, `src/theme-wysh-bw.css` (기본 테마 `wysh-bw`)

## 데이터 규칙 (필수)
- **더미/샘플 데이터 주입 금지**: 하드코딩된 샘플 제품, 계획, 재고 로그, 보고서 등을 코드나 초기화 로직에 넣지 않는다.
- **초기 기본값은 비워둔다**: `DEFAULT_PLANS`, `DEFAULT_INVENTORY`, `DEFAULT_REPORTS`, `DEFAULT_MATERIAL_COSTS` 등은 빈 배열 `[]` 또는 실제 사용자 데이터만 둔다.
- **삭제는 영구적이어야 한다**: 사용자가 삭제한 항목은 로컬 상태, localStorage, Supabase 모두에서 지워진 채로 유지되어야 한다. 시작·새로고침·동기화 때 되살아나면 안 된다.
- 동기화 로직을 수정할 때는 다른 기기의 변경이나 로컬 전용 필드(예: 레시피 메모)가 덮어써지지 않는지 확인한다.

## 기타
- `.env`(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)는 커밋하지 않는다.
- 로그인은 Supabase Auth 개인 계정(아이디 → `아이디@wysh.local`). 권한은 `profiles.permissions`, 규칙은 `src/utils/permissions.js`와 SQL `has_permission()`이 같아야 한다. 화면에서는 `useAuth().can('권한키')`로 검사한다.
- 계정 생성·비밀번호 초기화·비활성화는 `supabase/functions/admin-users` Edge Function(관리자만)으로 한다.
- `sample data/`의 엑셀 파일은 주문 파서 확인용 실제 주문 데이터 샘플이다.
- 커밋 메시지는 conventional 스타일 (`feat:`, `fix(scope):` 등).
