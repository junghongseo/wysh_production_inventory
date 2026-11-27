# 개인 계정·권한 2단계 인수인계 (2026-11-27 기준)

다른 컴퓨터나 새 Claude 세션에서 이어서 작업하기 위한 메모입니다.

## 지금까지 된 것

| 단계 | 내용 | 상태 |
|---|---|---|
| 1단계 | 개인 계정 로그인, 메뉴·기능 권한, 팀원 관리, 작업자 기록 (PR #1~#3) | 운영 반영 |
| 배합표 권한 | `calendar.recipe`(배합표 보기)를 생산계획 관리와 분리 (PR #4) | 운영 반영 |
| 2-A | 배합 데이터 → `product_recipes`, 배너 → `app_settings`, AI 매니저 호출자 권한 조회 (PR #5) | 운영 반영 |
| 로그아웃 수정 | `signOut({ scope: 'local' })` — 한 기기 로그아웃이 다른 기기 세션을 끊던 문제 (PR #6) | 운영 반영 |

- `ai-manager` Edge Function: v13, 게이트웨이 `verify_jwt = true`, 업무 데이터는 호출자 토큰으로 조회
- `admin-users` Edge Function: v1, `verify_jwt = true`
- 적용된 마이그레이션: `supabase_auth_profiles_migration.sql`, `supabase_recipe_view_permission_migration.sql`, `supabase_phase2a_data_separation_migration.sql`

**아직 기존 테이블의 RLS는 `USING (true)`로 열려 있습니다.** 화면에서만 권한을 숨기는 상태입니다.

## 2-B에서 할 일 (DB 잠금)

1. **배합 비율을 `products`에서 지우기**
   - 지우기 전에 `products.ingredients / recipe_memo / packaging`을 백업 테이블로 복사
   - `sync_product_recipe` 트리거를 BEFORE 트리거로 바꿔 "`product_recipes`로 복사한 뒤 `products` 쪽 값을 NULL로" 처리 → 앱 코드 변경 없이 비율이 `products`에 남지 않음
2. **기존 테이블 RLS 잠금**
   - 로그인하지 않은 접근(anon) 전부 차단
   - 쓰기와 민감 데이터 읽기는 `has_permission()` / `is_admin()` / `can_read_recipes()`로 제한
   - `material_costs` 읽기·쓰기는 `recipes.cost`
3. **출고 검증 보호 트리거** (`inventory`)
   - 출고 내역이 계획별 한 행의 JSONB `history` 배열이라 RLS만으로는 등록/검증을 구분할 수 없음
   - 트리거에서 OLD/NEW `history`를 비교: 검증 상태가 바뀌거나, 항목이 삭제되거나, 새 항목이 `verified: true`이면 `inventory.verify` 권한 필요
4. **`calendar_notes`의 `__banner_settings__` 행 정리** (배너는 이제 `app_settings`)
5. **되돌리기 SQL 준비**: 문제 시 즉시 지금처럼 열린 정책으로 복구

### 쓰기 경로 (권한 정책 설계 근거)

| 테이블 | 쓰는 화면 | 필요한 권한 |
|---|---|---|
| products | 레시피 설정, 제품 등록/삭제 | `menu.recipes` |
| plans | 생산계획 등록·수정·삭제 | `calendar.plans` |
| inventory | 출고 등록(재고), 검증·취소·메모(재고), 실제 수량 수정(보고서 병입, 수량 수정 모달) | `menu.inventory` / `inventory.verify` / `menu.reports` |
| calendar_notes | 일정 메모 | `calendar.notes` |
| reports | 보고서 작성·수정·확인·삭제 | `menu.reports` (+ 확인은 `reports.confirm`, 관능 보고서 제외) |
| shipping_charts | 주문 정리 | `menu.orders` |
| material_costs | 원재료 단가표 | `recipes.cost` |
| app_settings | 배너 | 관리자 |
| chat_history, events | AI 매니저 | `ai.manager` |

정책을 확정하기 전에 사용자 결정이 필요한 것: 보고서 삭제 허용 범위, AI 대화 기록을 모두가 볼지(현재 사용자 구분 컬럼 없음).

## 2-B 시작 전 체크리스트

- [ ] 팀원 관리 화면 "이전 버전 사용 0명" (최신 빌드 = PR #6 이후)
- [ ] 팀원 공지: 사용하는 모든 기기(PC·휴대폰)를 한 번씩 열기, 오전에 세션이 끊긴 기기는 다시 로그인
- [ ] 작업 시간 공지: 영업 종료 후 약 30분, 그 시간엔 입력 금지
- [ ] 권한별 허용 표 사용자 확인
- [ ] 잠금 SQL · 되돌리기 SQL · 백업 SQL 준비
- [ ] 적용 직후 관리자(`hong`)와 `test.worker`로 확인 (로그인은 사용자가 직접)

## 작업 규칙

- **테스트 계정**: 새 계정을 만들지 말고 활성 상태로 둔 `test.worker`(표시 이름 "테스트 팀원")의 권한을 바꿔 가며 사용. 현재 권한: 캘린더, 재고, 보고서, AI 매니저 (배합 권한 없음)
- **운영 DB 변경·배포·병합은 매번 사용자 확인 후**
- 개발 서버도 운영 Supabase에 연결됨 (별도 개발 DB 없음)
- 권한 규칙은 `src/utils/permissions.js`와 SQL `permission_parent()` / `has_permission()` / `can_read_recipes()`가 같아야 함

## 알려진 문제·주의

- 2026-11-26에 Data API가 새 JWT를 `PGRST303 JWT issued at future`로 거부한 적이 있음 (Supabase 서버 시계 차이, 프로젝트 재시작으로 해결). 로그인 직후 다시 로그인 화면으로 돌아가면 edge 로그에서 PGRST303부터 확인
- `AuthContext`의 `retryWhileTokenTooNew`는 그 재발 대비용
- 접속 기록(`last_seen_at`, `last_app_version`)은 계정당 하나라서, 여러 기기를 쓰는 팀원의 다른 기기 버전은 보이지 않음
