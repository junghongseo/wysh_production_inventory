import React, { useState, useMemo } from 'react';
import { useWysh } from '../WyshContext';

const UserManualView = () => {
  const { isAdminLoggedIn } = useWysh();

  // Active view mode: 'worker' | 'admin' (defaults to current login state)
  const [activeMode, setActiveMode] = useState(() => (isAdminLoggedIn ? 'admin' : 'worker'));
  
  // Search query state
  const [searchQuery, setSearchQuery] = useState('');

  // Selected category filter state: 'all' or specific category id
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Categories metadata
  const categories = [
    { id: 'all', label: '전체 보기', icon: '📂' },
    { id: 'calendar', label: '1. 생산 일정 & 배합표', icon: '📅' },
    { id: 'reports', label: '2. 리포트 작성 (3단계)', icon: '📝' },
    { id: 'inventory', label: '3. 차수별 재고 관리', icon: '📦' },
    { id: 'order', label: '4. 주문 자동 정리', icon: '🛒' },
    { id: 'recipes', label: '5. 제품 & 레시피 설정 (관리자)', icon: '⚙️', adminOnly: true },
    { id: 'ai', label: '6. AI 생산 매니저', icon: '✨' }
  ];

  // Helper to render text with search term highlighted
  const highlightText = (text, query) => {
    if (!query || !query.trim() || typeof text !== 'string') return text;
    const q = query.trim().toLowerCase();
    const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === q ? (
        <mark key={i} style={{ backgroundColor: 'rgba(250, 204, 21, 0.4)', color: 'inherit', padding: '0 2px', borderRadius: '4px', fontWeight: 'bold' }}>
          {part}
        </mark>
      ) : part
    );
  };

  // Comprehensive Manual Data Store
  const manualData = useMemo(() => [
    // -------------------------------------------------------------
    // CATEGORY 1: CALENDAR & PLANS
    // -------------------------------------------------------------
    {
      id: 'cal-1',
      categoryId: 'calendar',
      mode: 'all', // 'all', 'worker', 'admin'
      title: '📅 생산 계획 등록 및 차수 생성 (신규 생산 계획 버튼)',
      summary: '주간 생산 일정을 수립하고 요거트/부재료 생산 계획을 생성합니다.',
      tags: ['신규 생산 계획', '계획 등록', '2종 동시', '플레인', '플레이버', '부재료', '차수 ID', '용량 계산'],
      content: [
        {
          heading: '🔘 주요 버튼 및 아이콘 설명',
          items: [
            { term: '➕ [신규 생산 계획 등록]', desc: '상단 우측에 위치하며, 원하는 생산 날짜와 제품을 선택하여 새 생산 차수를 등록합니다.' },
            { term: '📆 달력 날짜 칸 내 [➕]', desc: '해당 일자를 시작일로 자동 지정하여 즉시 계획 등록 모달을 엽니다.' },
            { term: '📋 [생산 계획 상세 보기]', desc: '달력 내 생산 계획 카드를 클릭하면 차수 ID, 가동 발효조, 각 품목별 목표수량, 출고기한 및 소비기한 상세를 조회할 수 있습니다.' },
            { term: '🔍 [스케줄 유형 필터 칩]', desc: '[🌐 전체 일정], [🥛 요거트 생산], [🍞 부재료 생산] 칩을 클릭하여 달력에 표시되는 일정 종류를 간편하게 필터링합니다.' }
          ]
        },
        {
          heading: '📝 입력 항목 및 자동 계산 방식',
          items: [
            { term: '생산 구분 (요거트 vs 부재료)', desc: '완제품 요거트 생산과 자체 부재료(라즈베리 페이스트 등) 생산을 구분합니다.' },
            { term: '생산 방식 (단종 vs 2종 동시)', desc: '단일 발효조에서 1가지 제품을 생산할지, Base 발효 후 2가지 플레이버로 분할 병입할지 선택합니다.' },
            { term: '주문예상 / 마케팅 / 여유분 수량', desc: '세 항목을 입력하면 총 예정 생산량(Total Qty = 주문예상 + 마케팅 + 여유분)이 자동 합산됩니다.' },
            { term: '원재료 필요 총 용량 (Total Volume L)', desc: '목표 생산 수량, 개당 중량(g), 제품 수율(%)을 기반으로 발효조에 투입해야 할 필요 원유/원재료 리터(L) 수치가 자동 계산됩니다.' }
          ]
        },
        {
          heading: '🔍 드롭다운 옵션 및 필터 규칙',
          items: [
            { term: '생산 제품 드롭다운', desc: '등록된 전체 제품 중 선택한 생산 구분(요거트/부재료)에 부합하는 활성 제품 목록만 노출됩니다.' },
            { term: '발효조 선택 (1~4호기 / 대형 / 소형)', desc: '현재 사용 가능한 발효 탱크의 용량(L) 및 종류를 선택합니다.' }
          ]
        },
        {
          heading: '⚡ 데이터 연동 구조',
          items: [
            { term: '차수 ID 자동 생성', desc: '생산 계획 등록 시 "YYYYMMDD-순번" 형태의 고유 차수 ID가 생성되어 재고 및 3단계 리포트 전체에 자동 연동됩니다.' },
            { term: '출고기한 & 소비기한 산출', desc: '시작일 + 2일(병입 예정일) 기준으로 최종 출고기한(+7일)과 최종 소비기한(+22일)이 자동 계산되어 저장됩니다.' }
          ]
        }
      ]
    },
    {
      id: 'cal-2',
      categoryId: 'calendar',
      mode: 'admin',
      title: '👑 [관리자 전용] 원재료 배합표 보기·인쇄 (상세 사양) & 생산 계획 수정/삭제',
      summary: '관리자 권한으로 원재료 배합 비율표의 세부 항목을 확인 및 인쇄하고, 등록된 생산 계획을 변경/삭제합니다.',
      tags: ['배합표 보기', '배합표 인쇄', 'PDF 출력', '원유', '탈지분유', '유산균', '계획 수정', '계획 삭제', '관리자 권한'],
      content: [
        {
          heading: '🖨️ [관리자 전용] 원재료 배합표 (Recipe Drawer) 세부 출력 항목 안내',
          items: [
            { term: '1. 차수 헤더 기본 정보', desc: '고유 차수 ID, 생산 계획명, 생산 구분(단종/2종동시), 가동 발효기(1~4호기), 총 투입 용량(L), 담당자 서명란이 수록됩니다.' },
            { term: '2. 베이스 요거트 배합표 (Base Formula)', desc: '① 원유 투입 용량(L) 및 중량(kg)\n② 탈지분유 투입 비율(g/L) 및 총 투입 중량(g/kg)\n③ 접종 유산균 바이알/팩 투입 중량(g)\n④ 정제수 용량(L) 및 기준 공정 온도(살균 85℃ 30분 ➔ 냉각 40℃ ➔ 접종 42℃ ➔ 배양 43℃)' },
            { term: '3. 플레이버 혼합 배합표 (Flavor Mixing Table)', desc: '2종 동시 생산 또는 플레이버 생산 시:\n① 분할 요거트 요구 중량(g/kg)\n② 플레이버 부재료(과일 페이스트, 블랙카카오, 피스타치오 등) 투입 중량(g/kg)\n③ 베이스 요거트 혼합 비율(Base Ratio, 예: 70%)과 부재료 비율(30%)' },
            { term: '4. 부재료 전용 배합표 (Sub-ingredient Recipe)', desc: '라즈베리 페이스트 등 자체 생산 부재료 제작 시 필요 과일(g), 설탕(g), 펙틴(g) 배합 중량표' },
            { term: '5. A4 인쇄 & PDF 저장 기능', desc: '상단 [🖨️ 인쇄 / PDF 저장] 버튼 클릭 시 웹 브라우저 요소를 제외한 배합표 전용 표준 A4 규격 서식으로 깔끔하게 출력하거나 PDF로 저장 가능합니다.' }
          ]
        },
        {
          heading: '✏️ [관리자 전용] 계획 수정 및 삭제',
          items: [
            { term: '✏️ [계획 수정]', desc: '생산계획 상세 팝업 하단의 수정 버튼을 눌러 목표 수량, 시작일, 발효조 정보, 품목 구성을 변경합니다.' },
            { term: '🗑️ [계획 삭제]', desc: '더 이상 진행하지 않는 생산 계획을 완전 삭제합니다. 연동된 재고 및 리포트 기록도 함께 정돈됩니다.' }
          ]
        }
      ]
    },

    // -------------------------------------------------------------
    // CATEGORY 2: REPORTS
    // -------------------------------------------------------------
    {
      id: 'rep-1',
      categoryId: 'reports',
      mode: 'all',
      title: '📝 3단계 리포트 작성 파이프라인 (발효 ➔ 유청분리 ➔ 병입)',
      summary: '작업자가 생산 진행 상황에 맞춰 순차적으로 품질 및 생산 리포트를 작성합니다.',
      tags: ['발효 리포트', '유청분리 리포트', '병입 리포트', '작성자 서명', 'pH', '수율', '교반기'],
      content: [
        {
          heading: '🔍 단계별 드롭다운 생산 계획 노출 필터 규칙 (핵심)',
          items: [
            { term: '1단계: 발효 리포트 드롭다운', desc: '이번 주에 활성화된 요거트 생산 계획 전체가 선택 가능하도록 드롭다운에 표출됩니다.' },
            { term: '2단계: 유청분리 리포트 드롭다운', desc: '발효 리포트는 작성 완료되었으나, 아직 유청분리 리포트가 작성되지 않은 생산 계획건만 선택할 수 있도록 드롭다운에 노출됩니다.' },
            { term: '3단계: 병입 리포트 드롭다운', desc: '유청분리 리포트까지 작성 완료되었으나, 아직 병입 리포트가 작성되지 않은 생산 계획건만 선택할 수 있도록 드롭다운에 노출됩니다.' }
          ]
        },
        {
          heading: '🥣 1단계: 발효 리포트 주요 항목',
          items: [
            { term: '🔒 보안 처리된 생산 계획 정보 요약', desc: '생산 계획 선택 시 레시피 보안 유출을 방지하기 위해 원재료 배합 비율 및 필요 베이스 총량을 가리고, 기준 베이스 제품명, 생산 목표 수량, 가동 발효기 정보만 간결하게 표출합니다.' },
            { term: '체크리스트 7종', desc: '살균, 냉각, 접종, 배양, 히터가동, 히터저온, 교반기 작동 여부를 각각 체크합니다.' },
            { term: '⚙️ [교반기 작동 확인 모달]', desc: '교반기 체크 시 작동 안전 확인을 위한 확인 팝업 모달창이 발동되어 정확한 입력을 보장합니다.' },
            { term: '작성자 서명', desc: '작업 수행자의 성명을 텍스트 서명으로 기재합니다.' }
          ]
        },
        {
          heading: '🧪 2단계: 유청분리 리포트 주요 항목 및 산출 공식',
          items: [
            { term: '묽기 선택 & 메모', desc: "'되직함', '보통', '묽음' 3단계 묽기 선택 및 메모 기재" },
            { term: '이물질 발견 여부', desc: '이물질 없음(정상) 또는 발견 시 상세 사유를 명시하여 품질 이슈를 기록합니다.' },
            { term: '밧드 개수 & 마지막 밧드 무게', desc: '추출 밧드 수와 마지막 밧드의 무게(g)를 입력하면 총 유청 요거트 무게(g)와 유청 로스율(Loss Rate %)이 자동 계산됩니다.' },
            { term: 'pH 수치 측정 게이지', desc: '측정된 pH(예: 4.45)를 입력하면 제품별 적정 범위(플레인 4.20~4.58 / 머드그릭 4.10~4.38) 및 과거 평균 pH와 비교하는 컬러 게이지가 즉시 반응합니다.' }
          ]
        },
        {
          heading: '🍾 3단계: 병입 리포트 수율 & 소비기한 계산 공식',
          items: [
            { term: '목표 수율 (Target Yield %)', desc: '플레이버 제품 생산 시 베이스 요거트의 목표 수율(예: 28%)이 자동으로 적용되어 수율 목표치로 설정됩니다.' },
            { term: '실제 수율 (Actual Yield %)', desc: '플레이버 제품 생산 시 요거트 함량 비율(Base Ratio %, 예: 70%)을 곱하여 베이스 요거트 환산 무게를 구한 뒤, 원재료 투입 무게 대비 실제 수율을 정밀 산출합니다.' },
            { term: '실제 입고량 산출 공식', desc: '실제 입고 수량 = 총 병입 완성 수량(개) - (샘플/차감 수량)' },
            { term: '소비기한 2줄 독립 표기', desc: '2종 동시 생산 시 각 품목별 소비기한(병입일+22일)과 입고 수량이 역사 카드의 각각 독립된 2개 줄로 명확하게 나누어 표기됩니다.' }
          ]
        }
      ]
    },
    {
      id: 'rep-2',
      categoryId: 'reports',
      mode: 'admin',
      title: '👑 [관리자 전용] 리포트 확인 처리 (승인) & 재고 자동 연동',
      summary: '작업자가 제출한 리포트를 검증하고 승인하여 실제 입고량을 재고에 자동으로 반영합니다.',
      tags: ['확인 처리', '미확인', '확인완료', '재고 자동 반영', '음영 처리', '관리자 승인'],
      content: [
        {
          heading: '🔘 승인 프로세스 & 시각적 구별',
          items: [
            { term: '⚠️ 미확인 (작업자 제출 직후)', desc: '작업자가 작성한 리포트는 연한 오렌지 음영 배경과 [⚠️ 미확인] 뱃지가 표시됩니다.' },
            { term: '✓ [확인 처리] 버튼 (관리자 전용)', desc: '관리자 로그인 상태에서 이력 카드의 [✓ 확인 처리] 버튼을 누르면 1회의 확인 팝업 후 승인 완료 처리됩니다.' },
            { term: '✓ 확인완료', desc: '승인 후 정상 배경과 [✓ 확인완료] 뱃지로 변경되며, Cloud DB 동기화 후에도 승인 상태가 영구 보존됩니다.' }
          ]
        },
        {
          heading: '⚡ 병입 리포트 확인 시 재고 자동 반영',
          items: [
            { term: '자동 입고 수량 연동', desc: '관리자가 병입 리포트를 승인하는 즉시, 병입 리포트의 실제 입고 수량이 차수별 재고 리스트의 "실제 입고(개)" 항목에 자동으로 전달되어 재고가 연동됩니다.' }
          ]
        }
      ]
    },

    // -------------------------------------------------------------
    // CATEGORY 3: INVENTORY
    // -------------------------------------------------------------
    {
      id: 'inv-1',
      categoryId: 'inventory',
      mode: 'all',
      title: '📦 차수별 생산 및 재고 리스트 & 사용(출고) 등록',
      summary: '생산 차수별 입고량, 출고 누적, 현재 재고를 조회하고 출고를 등록합니다.',
      tags: ['차수별 재고', '출고 등록', '현재 재고', '출고기한', '소비기한', '작성자 서명'],
      content: [
        {
          heading: '📊 재고 리스트 표 항목 안내',
          items: [
            { term: '계획 수량 vs 실제 입고', desc: '초기 계획 수량과 승인된 병입 리포트에서 자동 연동된 실제 입고 수량을 한눈에 비교합니다.' },
            { term: '현재 재고 산출 공식', desc: '현재 재고 = 실제 입고 수량 - 총 출고(사용) 누적 수량. (100개 미만 시 붉은색 강조 표출)' },
            { term: '연동 상태 뱃지', desc: '병입 리포트 승인 여부에 따라 [✓ 병입 입고 연동완료] 또는 [리포트 승인 대기]로 표시됩니다.' }
          ]
        },
        {
          heading: '📝 사용(출고) 입력 규칙 및 검증',
          items: [
            { term: '출고 차수 선택 드롭다운 규칙', desc: '출고기한 내에 있고, 현재 재고가 1개 이상 남은 생산 차수/품목만 선택 가능하도록 노출됩니다.' },
            { term: '출고 수량 초과 방지', desc: '현재 남은 재고 수량을 초과하는 수량은 등록할 수 없도록 자동 검증 알림이 발동합니다.' },
            { term: '미래 일자 경고', desc: '출고 일자를 오늘 이후로 지정할 경우 미래 일자 확인 알림창이 표출됩니다.' },
            { term: '필수 입력 정보', desc: '출고 차수, 수량(1개 이상), 출고 용도(판매, 샘플, 마케팅, 폐기 등), 일자/시간, 작성자 서명을 기입합니다.' }
          ]
        }
      ]
    },
    {
      id: 'inv-2',
      categoryId: 'inventory',
      mode: 'admin',
      title: '👑 [관리자 전용] 출고 내역 검증 및 메모 관리',
      summary: '작업자가 등록한 출고 내역을 검증(`✓`) 처리하거나 상세 메모를 관리합니다.',
      tags: ['출고 검증', '관리자 검증', '출고 메모', '내역 수정'],
      content: [
        {
          heading: '🔘 주요 관리자 기능',
          items: [
            { term: '✓ [출고 검증]', desc: '하단 출고 타임라인에서 관리자가 내역을 검증 완료 처리하면 검증 뱃지가 부여됩니다.' },
            { term: '✏️ [출고 내역 수정/삭제]', desc: '잘못 입력된 출고 일자, 수량, 용도를 수정하거나 삭제하여 재고를 원복시킵니다.' }
          ]
        }
      ]
    },

    // -------------------------------------------------------------
    // CATEGORY 4: ORDER PARSER
    // -------------------------------------------------------------
    {
      id: 'ord-1',
      categoryId: 'order',
      mode: 'all',
      title: '🛒 주문 자동 정리 및 재고 적정성 확인',
      summary: '복사한 주문 텍스트를 붙여넣어 주문 정보와 재고 수량을 자동 비교합니다.',
      tags: ['주문 자동 정리', '주문 파싱', '주문자명', '재고 비교', '발주 점검'],
      content: [
        {
          heading: '🔘 사용 방법 및 기능',
          items: [
            { term: '📋 [주문서 붙여넣기]', desc: '카카오톡, 스마트스토어, 문자 등으로 받은 주문 텍스트를 입력창에 붙여넣고 정리 버튼을 누릅니다.' },
            { term: '🔍 자동 추출 항목', desc: '주문자 성함, 연락처, 배송지 주소, 제품별 주문 수량이 자동으로 분류되어 표로 정리됩니다.' },
            { term: '⚡ 현재 재고 자동 비교', desc: '정리된 주문 수량과 차수별 재고의 출고 가능 재고 수량을 비교하여 출고 가능 여부를 시각적으로 알려줍니다.' }
          ]
        }
      ]
    },

    // -------------------------------------------------------------
    // CATEGORY 5: RECIPES & PRODUCTS (ADMIN ONLY)
    // -------------------------------------------------------------
    {
      id: 'rec-1',
      categoryId: 'recipes',
      mode: 'admin',
      title: '👑 [관리자 전용] 제품 등록 및 기준 배합 비율 설정',
      summary: '플레인, 플레이버, 부재료 제품을 관리하고 기본 수율, 용량, 소비기한 기준을 정의합니다.',
      tags: ['제품 등록', '레시피 설정', '베이스 제품', '플레이버 함량', '목표 수율', '유통기한'],
      content: [
        {
          heading: '⚙️ 제품 분류 및 기준 설정',
          items: [
            { term: '플레인 (Base Yogurt)', desc: '모든 플레이버 제품의 기준이 되는 베이스 요거트입니다 (예: 플레인 100g, 목표수율 28%).' },
            { term: '플레이버 (Flavor Yogurt)', desc: '베이스 요거트에 과일/부재료가 혼합된 제품입니다. 베이스 제품 지정 및 요거트 비율(예: 70%)을 설정합니다.' },
            { term: '부재료 (Sub Ingredient)', desc: '자체 제조하는 수제 페이스트/부재료입니다 (예: 라즈베리 페이스트).' },
            { term: '기본 공정 기준값', desc: '살균 온도(85℃), 살균 시간(30분), 냉각(40℃), 접종(42℃), 배양(43℃) 등 제품별 기본 온도값을 등록합니다.' }
          ]
        }
      ]
    },

    // -------------------------------------------------------------
    // CATEGORY 6: AI MANAGER
    // -------------------------------------------------------------
    {
      id: 'ai-1',
      categoryId: 'ai',
      mode: 'all',
      title: '✨ AI 생산 매니저 활용 가이드',
      summary: '대화형 AI 보조 기능을 활용하여 재고 조회, 공정 가이드, 가상 질의응답을 진행합니다.',
      tags: ['AI 생산매니저', '모바일 바텀시트', '드래그 닫기', '음성 질문', '재고 문의'],
      content: [
        {
          heading: '📱 모바일 사용 편의 기능',
          items: [
            { term: '🖐️ 상단 드래그 다운 종료 제스처', desc: '모바일 화면에서 AI 채팅창 상단의 회색 손잡이 영역을 잡고 아래로 슬라이드 드래그하면 창이 부드럽게 꺼집니다.' },
            { term: '💬 대화 모드 / 질의응답', desc: '"현재 플레인 요거트 재고 얼마 남아있어?", "유청분리 로스율 계산 방법 알려줘" 등 자연어로 질문할 수 있습니다.' }
          ]
        }
      ]
    }
  ], []);

  // Filter manuals based on mode, category, and search query
  const filteredManuals = useMemo(() => {
    return manualData.filter(item => {
      // 1. Role mode filter (if item is admin-only, hide in worker mode)
      if (activeMode === 'worker' && item.mode === 'admin') {
        return false;
      }

      // 2. Category filter
      if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) {
        return false;
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchSummary = item.summary.toLowerCase().includes(q);
        const matchTags = item.tags.some(t => t.toLowerCase().includes(q));
        const matchContent = item.content.some(c => 
          c.heading.toLowerCase().includes(q) ||
          c.items.some(i => i.term.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q))
        );

        if (!matchTitle && !matchSummary && !matchTags && !matchContent) {
          return false;
        }
      }

      return true;
    });
  }, [manualData, activeMode, selectedCategory, searchQuery]);

  return (
    <div className="manual-layout" style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* Header Banner */}
      <div className="glass-card" style={{ padding: '24px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08), rgba(99, 102, 241, 0.05))', border: '1px solid rgba(2, 132, 199, 0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.8rem' }}>📖</span>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                WYSH 생산 및 재고 관리 스마트 매뉴얼
              </h2>
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              모드별(일반 작업자 / 관리자) 상세 사용 설명, 버튼 기능, 배합표 세부 출력 항목, 드롭다운 필터 규칙 및 수율·소비기한 연동 공식을 검색할 수 있습니다.
            </p>
          </div>

          {/* Mode Switcher Toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setActiveMode('worker')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                transition: 'all 0.2s ease',
                background: activeMode === 'worker' ? 'linear-gradient(135deg, #0284c7, #2563eb)' : 'transparent',
                color: activeMode === 'worker' ? '#ffffff' : 'var(--text-secondary)',
                boxShadow: activeMode === 'worker' ? '0 2px 8px rgba(2, 132, 199, 0.3)' : 'none'
              }}
            >
              👤 일반 사용자 (작업자) 모드
            </button>
            <button
              onClick={() => setActiveMode('admin')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                transition: 'all 0.2s ease',
                background: activeMode === 'admin' ? 'linear-gradient(135deg, #7c3aed, #9333ea)' : 'transparent',
                color: activeMode === 'admin' ? '#ffffff' : 'var(--text-secondary)',
                boxShadow: activeMode === 'admin' ? '0 2px 8px rgba(124, 58, 237, 0.3)' : 'none'
              }}
            >
              👑 관리자 모드
            </button>
          </div>
        </div>

        {/* Real-time Search Input Bar */}
        <div style={{ marginTop: '20px', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
            🔍
          </div>
          <input
            type="text"
            className="form-control"
            placeholder="버튼명, 작성항목, 배합표 세부항목, 수율, 소비기한, 출고, 리포트 등 궁금한 키워드를 입력하세요..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              paddingLeft: '46px',
              paddingRight: searchQuery ? '40px' : '16px',
              height: '48px',
              fontSize: '0.95rem',
              borderRadius: '12px',
              border: '2px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '1rem',
                padding: '4px'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Category Navigation + Right Manual Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', alignItems: 'flex-start' }} className="manual-grid-container">
        
        {/* Left Side Category Menu */}
        <div className="glass-card" style={{ padding: '16px', borderRadius: '14px', position: 'sticky', top: '90px' }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
            목차 카테고리
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {categories.map(cat => {
              if (cat.adminOnly && activeMode === 'worker') return null;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    fontWeight: isSelected ? 700 : 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'all 0.15s ease',
                    background: isSelected ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
                    color: isSelected ? 'var(--color-primary)' : 'var(--text-primary)'
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Manual Cards Content List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Active Mode Notice */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)', padding: '0 4px' }}>
            <span>
              현재 보기 모드: <strong style={{ color: activeMode === 'admin' ? '#7c3aed' : '#0284c7' }}>{activeMode === 'admin' ? '👑 관리자 모드' : '👤 일반 사용자 (작업자) 모드'}</strong>
            </span>
            <span>검색 결과: <strong>{filteredManuals.length}개</strong> 항목</span>
          </div>

          {filteredManuals.length === 0 ? (
            <div className="glass-card" style={{ padding: '50px', textAlign: 'center' }}>
              <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                🔍 "{searchQuery}"에 일치하는 매뉴얼 내용이 없습니다.
              </p>
              <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                다른 단어로 검색해보시거나 상단 [전체 보기] 카테고리를 선택해 보세요.
              </span>
            </div>
          ) : (
            filteredManuals.map(item => (
              <div 
                key={item.id} 
                className="glass-card" 
                style={{ 
                  padding: '24px', 
                  borderRadius: '14px',
                  borderLeft: item.mode === 'admin' ? '5px solid #7c3aed' : '5px solid #0284c7',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                {/* Title & Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {highlightText(item.title, searchQuery)}
                  </h3>
                  {item.mode === 'admin' && (
                    <span style={{ fontSize: '0.72rem', background: 'rgba(124, 58, 237, 0.15)', color: '#7c3aed', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                      👑 관리자 전용
                    </span>
                  )}
                </div>

                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {highlightText(item.summary, searchQuery)}
                </p>

                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {item.tags.map((tag, idx) => (
                    <span 
                      key={idx} 
                      onClick={() => setSearchQuery(tag)}
                      style={{ 
                        fontSize: '0.74rem', 
                        background: 'var(--bg-tertiary)', 
                        color: 'var(--color-primary)', 
                        padding: '2px 8px', 
                        borderRadius: '6px', 
                        cursor: 'pointer',
                        fontWeight: 600 
                      }}
                      title="클릭하여 이 키워드로 검색"
                    >
                      #{highlightText(tag, searchQuery)}
                    </span>
                  ))}
                </div>

                {/* Content Sections */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px', paddingTop: '16px', borderTop: '1px dashed var(--border-color)' }}>
                  {item.content.map((sec, sIdx) => (
                    <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {highlightText(sec.heading, searchQuery)}
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {sec.items.map((sub, iIdx) => (
                          <div 
                            key={iIdx} 
                            style={{ 
                              background: 'var(--bg-secondary)', 
                              padding: '10px 14px', 
                              borderRadius: '10px', 
                              border: '1px solid var(--border-color)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px'
                            }}
                          >
                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-primary)' }}>
                              {highlightText(sub.term, searchQuery)}
                            </span>
                            <span style={{ fontSize: '0.83rem', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                              {highlightText(sub.desc, searchQuery)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

        </div>
      </div>
    </div>
  );
};

export default UserManualView;
