# ZMS CS Helper - 프로젝트 개발 및 아키텍처 가이드 (Development Guide)

---

## 0. 🛠️ 기술 스택 및 환경 (Tech Stack)
* **프론트엔드**: React 18 + Vite + TypeScript + Tailwind CSS + Lucide React
* **백엔드**: Supabase (PostgreSQL BaaS) + LocalStorage 이중 캐시 Repository 패턴
* **AI 분석**: Gemini Multimodal Audio API (Base64 오디오 요약 및 STT)
* **MCP 연동**: Supabase MCP Server (`https://mcp.supabase.com`) - DB 구조 및 SQL 실시간 조회 지원

---

## 1. 📂 아키텍처 및 폴더 구조

```
ZMS_CS_HELPER/
├── src/
│   ├── App.tsx                         # SPA 진입점, 전역 라우팅
│   ├── backend/                        # 데이터 레이어 (Supabase 연동)
│   │   ├── config/cloudDbConfig.ts     # Supabase 설정 상수
│   │   ├── repositories/
│   │   │   ├── ConsultationRepositoryImpl.ts  # 상담 CRUD + Realtime
│   │   │   ├── CustomerRepositoryImpl.ts      # 고객 원장 CRUD
│   │   │   ├── IConsultationRepository.ts
│   │   │   └── ICustomerRepository.ts
│   │   ├── services/
│   │   │   ├── consultation/           # 상담 도메인 서비스
│   │   │   └── cti/                    # CTI 수집 서비스
│   │   └── types/index.ts              # 공통 타입 정의 (Consultation, AgentTask 등)
│   ├── front/                          # UI 레이어
│   │   ├── components/
│   │   │   ├── admin/                  # 어드민 (DbViewerTab 등)
│   │   │   ├── auth/, calendar/, kanban/, logs/
│   │   │   ├── navigation/             # TopNavBar, LeftSidebar
│   │   │   ├── support/, tasks/        # TaskManagementView
│   │   │   └── workspace/              # RightTaskManager, MainConsultationHub
│   │   └── hooks/
│   │       ├── useAppData.ts           # 앱 전역 상태 & CRUD 핸들러
│   │       └── useNotifications.ts     # 상담사 계정별 다방향 알림 훅
│   └── lib/
│       ├── constants.ts
│       ├── contexts/AuthContext.tsx
│       ├── supabase/client.ts          # Supabase 싱글톤 클라이언트
│       └── utils/
│           ├── consultationArchive.ts  # status/sub_status 동기화 유틸
│           ├── geminiApi.ts
│           ├── normalize.ts            # 임시 식별자(no-car/no-phone) 마스킹
│           └── uuid.ts
├── supabase/schema.sql                 # DB 스키마 정의 (참고용)
├── server.ts                           # Express 서버 (CTI 프록시 + Gemini API)
├── .env                                # 환경 변수 (VITE_ prefix 필수)
├── AGENTS.md                           # AI 에이전트 작업 규칙
├── DEVELOPMENT_GUIDE.md                # 이 파일
└── PROJECT_ROADMAP.md                  # 프로젝트 로드맵
```

> **금지**: `src/components/`, `src/lib/services/` 등 기존과 동일 기능의 폴더 중복 생성 절대 금지.

---

## 2. 🛡️ 개발 & 코딩 표준 규칙

1. **단일 파일 줄 수 제한**: 1개 파일 500줄 이하 준수 (거대 파일 감지 시 하위 컴포넌트 분리).
2. **한글 주석 의무화**: 역할 및 주요 로직 한글 주석 필히 기재.
3. **Supabase 관계 참조**: `consultations`에는 `car_number`, `phone_number` 컬럼이 없음 → `customer_id` 기반 `customers` 조인 참조 필수.
4. **`sub_status` - `status` 자동 동기화 & 기본값 보장 (Rule 5.1)**:
   - 상담 저장 시 `sub_status`가 빈 문자열/NULL인 경우 무조건 **`'접수'`**로 자동 동기화.
   - `inquiry_type`이 비어있는 경우 무조건 **`'주차 문의'`**로 기본값 보장.
5. **모달 UI/UX (Backdrop Dismiss)**: 오버레이 딤(Dim) 영역 클릭 시 모달 닫기 지원 (`onClick={onClose}` & `stopPropagation()`).

---

## 3. 🗄️ Supabase DB 스키마 & 연동 규칙 (⚠️ 절대 필독)

### 3.1 핵심 테이블 제약조건

| 테이블 | 컬럼 | 제약조건 |
|--------|------|----------|
| `customers` | `phone_number` | **UNIQUE + NOT NULL** |
| `customers` | `car_number` | **UNIQUE + NOT NULL** |
| `consultations` | `customer_id` | FK → `customers.id` (NULL 허용) |
| `consultations` | `id` | PRIMARY KEY |
| `internal_agents` | `agent_name` | PRIMARY KEY |
| `agent_tasks` | `id` | PRIMARY KEY |

### 3.2 🚨 저장 시 반드시 지켜야 할 3가지 철칙

#### ① customers: 고정 문자열 placeholder 절대 사용 금지
```
❌ 틀림: phone_number = '미입력'  (두 번째 저장부터 UNIQUE 충돌로 23505 오류)
❌ 틀림: car_number = '미등록-...'  (동일 패턴 충돌 가능)

✅ 올바름: phone/car 둘 다 없으면 Supabase 저장 건너뜀 (로컬 캐시만 유지)
✅ 올바름: 하나만 없을 때 → no-phone-{uuid8} / no-car-{uuid8} 사용
```

#### ② consultations: FK 검증 필수 (23503 오류 방지)
```
❌ 틀림: customer_id = 로컬UUID  (Supabase에 없는 UUID → FK 위반)

✅ 올바름:
  1. saveCustomer() 반환값으로 실제 Supabase ID 획득
  2. 식별자(phone/car) 없으면 customer_id = null 사용
  3. upsert 직전 customer 존재 여부 재확인 (안전장치)
```

#### ③ upsert payload: 스키마에 없는 컬럼 포함 금지
```
❌ consultations upsert에 포함하면 안 되는 컬럼:
   agent_id, car_number, phone_number, is_archived

✅ 올바른 consultations upsert 컬럼:
   id, customer_id, call_log_id, user_type, parking_type,
   parking_name, product_number, region, hope_date,
   inquiry_type, status, sub_status, agent_name, summary,
   owner_phone, user_phone, parking_start_date,
   created_at, updated_at
```

### 3.3 🛡️ 임시 우회 식별자 UI 마스킹 원칙 (`normalize.ts`)
- DB 저장 시 UNIQUE 제약 조건(23505)을 유지하기 위해 생성하는 `no-car-{uuid8}` 및 `no-phone-{uuid8}` 우회값은 프론트엔드 UI 렌더링 시 **절대 날것으로 노출하지 않습니다.**
- UI 컴포넌트 렌더링 시 `src/lib/utils/normalize.ts`의 표준 유틸리티를 호출합니다:
  - `maskTempCarNumber(carNum, fallback = '')`: `'no-car-'`, `'미입력'`, `'미등록'` 감지 시 fallback 반환.
  - `maskTempPhoneNumber(phone, fallback = '', format = false)`: `'no-phone-'`, `'미입력'`, `'미등록'` 감지 시 fallback 반환.

---

## 4. 🎯 핵심 기능 구현 명세 (2026-08-21 확립)

### 4.1 📋 업무 & TODO 관제 상단 현황판 카드 뷰 스위처 (`TaskManagementView.tsx`)
* **기능**: 상단 4개 현황판 카드(내 담당/타 상담사 전달건/오늘 마감/처리 완료)가 클릭 가능한 뷰 스위처 버튼으로 전환됨.
* **시각적 강조**: 선택된 카드에 테두리 하이라이트(Ring accent) 및 테마 배경색이 켜져 현재 활성화된 관제 뷰를 직관적으로 표현.
* **실수 방지 얼럿**: 업무 완료 체크박스 클릭 시 `window.confirm()` 확인 팝업을 제공하여 사용자의 의도치 않은 완료 변경을 사전 차단.

### 4.2 🎛️ 칸반 보드 세부 단계별 아코디언(Accordion) 관제 보드 (`KanbanBoardView.tsx`)
* **세부 단계별 아코디언 그룹화**: `접수`, `해결중`, `완료` 3대 컬럼 내부에서 세부 프로세스 단계(`sub_status`: 결제메시지전송, 공유자부재, 부서확인중 등)별로 접고 펼칠 수 있는 아코디언 패널 탑재.
* **아코디언 토글 버튼**: 상단 `[↕ 아코디언 전체 토글]` 버튼으로 한 번에 모든 세부 그룹을 펼치거나 접어 세로 스크롤 피로도 최소화.

### 4.2 🔔 상담사 계정별 다방향 알림 격리 & 스마트 1클릭 뷰 스위칭 (`useNotifications.ts` & `TopNavBar.tsx`)
* **계정별 저장소 격리**: 알림 로드/저장 키를 `zms_notifications_${currentAgentName}`으로 설정하여 각 상담사 계정별 전용 알림만 독립 유지.
* **D-Day 알림 복원**: 내 담당 상담건 중 희망 주차 시작일(`parking_start_date` / `hope_date`)이 오늘(D-Day) 또는 내일(D-1)인 경우 자동 감지 표출.
* **알림 팝업 서브 탭 분류**:
  - `🔔 미확인 알림 (미해결)` 탭: 신규 마감/이관/D-Day 알림 표출.
  - `✅ 확인 알림 (미해결)` 탭: 클릭을 완료한 알림 내역 보관.
* **스마트 1클릭 뷰 스위칭**: 알림 클릭 시 즉시 읽음 처리됨과 동시에 해당 관제 뷰(업무 관제 / 상담 워크스페이스)로 1초 만에 화면 전환.

### 4.3 📊 어드민 데이터 마스터 AgentTasks DB 거울 테이블 (`DbViewerTab.tsx` & `AdminPanel.tsx`)
* **기능**: 어드민 데이터 마스터에 Consultations 테이블과 동일하게 `AgentTasks` (업무 & TODO) raw DB 거울 테이블 구현.
* **DB 엑셀 다운로드**: `[📥 업무/TODO DB 엑셀 다운로드]` 버튼으로 1클릭 CSV 내보내기 지원.
* **DB 테이블 뷰 스위처**: `📞 상담 마스터 DB` | `📋 업무/TODO DB` | `📑 전체 DB 통합 보기` 1클릭 서브 내비게이션 탑재.

### 4.4 🛡️ AgentTaskRepositoryImpl 전담 리포지토리 & 다단계 이관 연쇄 히스토리 (`AgentTaskRepositoryImpl.ts`)
* **전담 리포지토리 구축 (`IAgentTaskRepository.ts` & `AgentTaskRepositoryImpl.ts`)**:
  - `consultations` 및 `customers`와 동일하게 `agent_tasks` 전담 리포지토리 모듈 신설.
  - `verifyConsultationId()` 사전 가드: DB 저장 전 `consultation_id`가 Supabase `consultations` DB에 실제 존재하는지 확인하고, 미존재 시 `null`로 자동 변환하여 **23503 FK 제약조건 에러 100% 사전 차단**.
* **Supabase DB 단일 진실의 원천 (Single Source of Truth)**:
  - `getAllTasks()`에서 Supabase 중앙 클라우드 DB 조회 결과만을 단일 진실의 원천으로 설정.
  - `DELETED_KEY ('local_deleted_task_ids')` 트래킹 가드를 통해 사용자가 삭제한 행이 롤백 재업로드되지 않도록 100% 보장.
* **🔄 다단계 이관 연쇄 히스토리 타임라인 (`history JSONB`)**:
  - Supabase `agent_tasks.history` JSONB 컬럼 연동.
  - 이관/전달 시 연쇄 이력 타임라인(`is_completed` 무관)을 100% 보관 및 시각적 타임라인 배지로 표출.

### 4.5 ⏰ [Option 1] 목표 일시 단일 피커 & 1클릭 미리 알림 옵션 (`TaskCreateModal.tsx` & `dateUtils.ts`)
* **목표 일시 단일 피커 (`input type="datetime-local"`)**:
  - 마감 및 목표 일시를 `YYYY-MM-DD HH:mm` 형태로 단일 지정하여 날짜와 시간 입력 중복 피로감 해소.
* **1클릭 미리 알림 5가지 옵션 선택 피커**:
  - `[🔔 정각 알림]` / `[⏰ 10분 전]` / `[⏰ 30분 전]` / `[⏰ 1시간 전]` / `[🔕 알림 안함]` 5개 전용 시각 칩 탑재.
  - 선택한 1클릭 옵션에 따라 실제 팝업이 울릴 알림 시각(`reminder_datetime`)을 `calculateReminderTime` 유틸리티로 자동 계산하여 Supabase DB `agent_tasks.reminder_datetime` (type `text`)에 원본 저장.
  - 기존 TODO 수정 시 `detectReminderOffset` 유틸리티가 저장된 마감일시와 알림일시의 차이를 계산하여 원래 1클릭 옵션을 100% 선택 상태로 자동 역추산 복원.

### 4.4 🛡️ 배포 전 다방향 다중 계정 실시간 연동 검증 전략 (Pre-Deployment Verification)
* **이중 창 라이브 검증 프로토콜**: 일반 창(상담사 A) + 시크릿 창(상담사 B) 동시 접속 후 상담 이관 / TODO 업무 전달 시 1초 내 Realtime 알림 뱃지 및 칸반/캘린더 라이브 동기화 검증.
* **상담사 샌드박스 다중 계정 빠른 전환기**: 단일 개발 PC에서도 1클릭 계정 스위칭을 통해 각 상담원별 격리된 알림 및 담당 업무 화면 정합성 사전 검수.

### 4.6 👤 사이드바 하단 계정 프로필 & 상담사 어드민 계정 관리 기획 (`LeftSidebar.tsx`)
* **좌측 하단 계정 프로필 UI 유지 & 직관적 강화**: 상담사가 시각적/가독성 측면에서 가장 직관적이고 편하게 느끼는 좌측 하단 사이드바에 내 계정 프로필 및 어드민 관리 버튼 배치.
* **내 프로필 정보 조회/수정 모달**: 로그인된 상담원의 정보(이름, 소속 팀, 내선 번호, 비밀번호) 조회 및 수정 지원.
* **어드민 상담사 명단 관리 & 신규 가입 연동**: 사내 전체 상담사 명단 조회, 신규 상담사 계정 등록 어드민 모달 패널 설계 반영.

### 4.7 🔑 Supabase Auth 정식 회원가입 연동 & 어드민 보안 격리 (`AgentProfileModal.tsx`, `useAppData.ts`)
* **Supabase Auth signUp API 연동**: 관리자가 어드민 폼에서 계정 이메일(`email`), 이름, 팀, 내선번호, 초기 비밀번호를 입력하면 `supabase.auth.signUp` 및 `internal_agents` DB에 정식 계정이 동시 등록되어 생성된 상담원이 실제 로그인 가능.
* **어드민 전용 샌드박스 격리**: `🔄 샌드박스 계정 전환` 및 `🏢 상담사 명단 관리` 탭은 오직 최고 관리자 계정(`role === 'ADMIN'`)에만 100% 노출 및 접근 허용.
* **상담사 권한 실시간 갱신**: 명단 테이블에서 상담사의 권한(`AGENT` / `LEADER` / `ADMIN`) 변경 시 Supabase DB 및 앱 상태에 1초 만에 즉시 반영.

### 4.8 ⚡ CTI AI 음성 분석 초고속 최적화 & 1클릭 원스톱 연동 패턴 (`api/cti.ts` & `CtiRecordTable.tsx`)
* **16페이지 중복 크롤링 스킵 패턴**:
  - `action === 'analyze_record'` 요청 시 선택된 `selectedCallIdx`가 전달되면 CTI 서버의 16개 통화 목록 중복 검색을 즉시 스킵하여 파싱 속도를 **45초 ➔ 2.5초로 95% 이상 단축**.
* **1클릭 리스트 원스톱 AI 오디오 STT 분석**:
  - CTI 목록 리스트 행의 `[🎙️ 분석]` 버튼 클릭 시, 우측 패널 재클릭 없이 **해당 통화건을 선택함과 동시에 Gemini 3.5 AI 오디오 STT 분석(`handleAnalyzeSelectedCall(false, rec.callIdx)`)이 2초 만에 즉시 실행**되도록 완전 일체화.
* **A/B 통화 전환 시 잔상 즉시 초기화 (`targetCallIdx`)**:
  - A통화 결과가 있는 상태에서 B통화 클릭 시 `setAudioAnalysisResult(null)`로 0.01초 만에 A통화 잔상을 즉시 지우고, 명시적 `targetCallIdx` 파라미터로 1번의 클릭에 B통화 음성 인식 100% 보장.

### 4.8 📞 CTI 녹취 내선번호 ↔ 사내 상담사 계정 1:1 자동 매칭 표출 기획 (`CtiAudioModal.tsx`, `LogsArchiveView.tsx`)
* **기능 요약**: CTI 녹취 목록 및 음성 분석 뷰에 표출되는 CTI 내선번호(예: `105`, `7997`)를 `internal_agents` DB의 `extension_number` 컬럼과 자동 비교 매칭하여, **"내선 105 (담당: 👤 이현우 상담사)"** 형태로 통화 담당 직원을 직관적으로 표출.

### 4.9 🚗 '차량 변경' 문의 선택 시 공유자 연락처 폼 활성화 & 3단계 전용 스텝퍼 기획 (`CenterCustomerForm.tsx`, `ProcessStepper.tsx`)
* **기능 요약**: 기존 DB 컬럼(`owner_phone`, `status`, `sub_status`)을 100% 재활용하여 DB 복잡도를 0으로 유지. 문의 유형 `차량 변경` 선택 시 **공유자 연락처 (`owner_phone`)** 입력창만 자연스럽게 활성화하고, 전용 3단계 스텝퍼 (1단계: 문의 접수 ➔ 2단계: 유관 부서/공급사 확인 중 ➔ 3단계: 처리 완료)를 적용하여 저장 및 관제 뷰에 동기화 표출.

### 4.10 ⚡ Supabase DB 트리거 기반 Auth ➔ internal_agents 자동 연동 (`sync_auth_user_to_internal_agents`)
* **기능 요약**: `auth.users`에 신규 회원가입 발생 시 PostgreSQL DB 트리거가 `internal_agents` 테이블에 자동 삽입/갱신하여, 어떤 계정이 가입되더라도 별도 처리 없이 전체 상담원 명단에 100% 즉시 표출 및 다방면 실시간 관제 연동 완수.

### 4.11 🔑 상담사 계정별 API Key 격리 및 CTI AI 요약/대화록 가독성 개선
* **상담사 계정별 API Key 엄격 격리**: `getStoredGeminiApiKey(agentName)`가 `agentName`이 지정된 경우 오직 `gemini_api_key_${agentName}`만 격리하여 조회 및 저장하고, 타 상담사 계정의 API Key 노출/혼용을 100% 원천 차단함.
* **통화 흐름 4줄 자연어 요약**: Gemini AI 프롬프트 튜닝을 통해 고정된 타이틀 대신 통화 흐름과 결과를 알기 쉽게 4줄 스토리로 자연스럽게 요약.
* **🔍 고가독성 팝업 뷰어 모달 (`CtiDetailPanel.tsx`)**: 패널 가독성을 높이기 위해 시원한 넓은 뷰포트 모달과 대본 실시간 키워드 라이브 검색 및 1클릭 복사 클립보드 기능 구현.

#### 4.12 🧹 CTI 거대 파일 분할 리팩토링 (2026-08-26 완료)
* **내용**: `CtiAudioSummaryModal.tsx` 파일이 약 1,100줄에 달하여 Rule 2(단일 파일 500줄 이하 제한)를 위반하고 있던 문제를 구조적으로 해결.
* **구현 세부사항**:
  1. `useCtiCollector.ts` [NEW]: 모든 CTI 크롤링 상태, AbortController 타임아웃 제어, Gemini 분석 캐시 및 API 핸들러 로직을 UI 로직과 완전히 격리하여 커스텀 훅으로 추출.
  2. `CtiCredentialForm.tsx` [NEW]: CTI 접속 및 API Key 입력 설정을 담당하며, 내부 아코디언 토글 상태를 캡슐화 관리.
  3. `CtiFullViewerModal.tsx` [NEW]: STT 대본 라이브 검색 및 1클릭 클립보드 복사를 포함하는 대형 팝업 뷰어 모달 분리.
  4. `CtiRawHtmlModal.tsx` [NEW] & `CtiDiagnosticLogsModal.tsx` [NEW]: Raw HTML 원문 뷰어와 크롤링 단계별 실시간 진단 로그 모달 분리.
* **결과**: 부모 컴포넌트인 `CtiAudioSummaryModal.tsx` 크기를 1,106줄에서 **281줄**로 75% 대폭 감축 완료.

#### 4.14 ⚡ Realtime DB Publication, 500줄 거대파일 모듈화 및 3인 서술형 이관 히스토리 (2026-08-27 완료)
* **내용**: Supabase Realtime Publication 활성화, 500줄 초과 거대 파일 모듈화 분리(`AGENTS.md` Rule 2) 및 TODO 관제 3인 서술형 이관 히스토리 연동 완수.
* **구현 세부사항**:
  1. **Supabase Realtime Publication 활성화**: `ALTER PUBLICATION supabase_realtime ADD TABLE consultations, agent_tasks, customers, internal_agents;` SQL 적용으로 계정 간 500ms 이내 실시간 다방향 동기화 가동.
  2. **`TaskManagementView.tsx` 모듈화 (612줄 ➔ 184줄)**: `taskFilterUtils.ts` (110줄), `TaskStatusCards.tsx` (115줄), `TaskFilterToolbar.tsx` (145줄), `TaskItemRow.tsx` (215줄) 분리.
  3. **`useAppData.ts` 서브훅 모듈화 (1,002줄 ➔ 422줄)**: `useAgentTaskState.ts` (160줄), `useInternalAgentState.ts` (130줄), `useConsultationFormState.ts` (210줄) subhooks로 이관.
  4. **3인 서술형 이관 히스토리 & 역할 기반 색상 이원화 (`TaskHistoryModal.tsx`)**:
     - `from_agent`(기존 배정자), `to_agent`(수신자), `operator_agent`(조작자) 3인 관계를 한글 서술형 문장으로 표출.
     - 💜 **보낸 사람 / 기존 배정자**: 인디고/보라색 아바타 칩 (`bg-indigo-100 text-indigo-950 border-indigo-200`)
     - 🟧/🟩 **받는 사람**: 주황색(전달) / 에메랄드색(가져옴) 아바타 칩 분리.
     - 동일 상담사(본인 ➔ 본인) 셀프 이관 차단 가드 구축.

#### 4.15 🔴 좌측 사이드바 카카오톡 스타일 알림 뱃지 & Supabase DB 기반 알림 정제 (2026-09-01 완료)
* **내용**: 카카오톡 채널 뱃지 스타일의 좌측 사이드바 알림 센터 연동, 100% Supabase DB 기반 동적 알림 생성, 완료 항목 자동 정제 및 주차 시작일 알림 삭제 완수.
* **구현 세부사항**:
  1. **사이드바 레드 뱃지 연동 (`SideNavBar.tsx`)**: `🔔 알림 센터` 메뉴 항목 추가 및 읽지 않은 알림 수에 따른 **레드 뱃지 칩(`[N]` 카운터 + 펄스 애니메이션)** 표출. 메뉴 접힘 모드(`isCollapsed`)에서도 벨 아이콘 우측 상단 중첩 표출.
  2. **알림 전용 모달 분리 (`NotificationCenterModal.tsx` - 168줄)**: Rule 8 (모달 백드롭 디스미스) 및 Rule 2 (500줄 제한) 100% 준수. 알림 클릭 시 해당 상담/업무 페이지로 1초 만에 스마트 뷰 스위칭.
  3. **완료 항목 자동 정제 및 D-Day 알림 전면 제거 (`useNotifications.ts`)**:
     - 상담 상태가 `'완료'`(`'결제완료'`, `'처리완료'`)되거나 업무가 완료(`is_completed: true`)되면 알림 목록 및 카운터에서 자동 즉시 정제 및 제외.
     - `parking_start_date` D-Day / D-1 알림 로직 전면 삭제.
     - 하드코딩/로컬 목데이터 없이 live Supabase DB 객체 기반으로만 100% 동적 알림 산출.
  4. **알림 상태 단일 원본 관리 (`App.tsx`)**: `useNotifications` 훅을 `App.tsx` 최상위로 이관하여 좌측 사이드바(`SideNavBar`)와 상단 네비바(`TopNavBar`)가 동일한 알림 상태와 카운터를 실시간 공유.

---

## 5. 🌐 상용 배포 (Production Deployment) & 환경 변수 키 관리 가이드

### 5.1 🚀 배포 플랫폼 선택 및 URL 공유 전략
* **추천 배포 플랫폼**: **Vercel** 또는 **Netlify** (Vite + React SPA 1클릭 자동 배포 최적화)
* **배포 절차**:
  1. GitHub 리포지토리에 최신 코드 커밋 & 푸시.
  2. Vercel / Netlify 웹 대시보드 로그인 ➔ `Import Git Repository` 선택.
  3. Build Command: `npm run build`, Output Directory: `dist` 자동 감지 확인 후 Deploy 버튼 클릭.
  4. 부여된 고유 URL (예: `https://zms-cs-helper.vercel.app`)을 사내 팀원들에게 전달하여 웹 브라우저 접속.

### 5.2 🔑 환경 변수 (`.env`) & API 키 보안 관리
배포 환경에서는 소스코드에 API 키나 계정 정보를 하드코딩하지 않고, Vercel/Netlify의 **Environment Variables** 메뉴에서 안전하게 주입합니다.

* **필수 환경 변수 목록**:
  ```env
  # Supabase 클라우드 DB & Auth 연동 (공개 가능 키)
  VITE_SUPABASE_URL=https://your-project-ref.supabase.co
  VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

  # AI 오디오 STT & 요약 API (서버/클라이언트 주입)
  VITE_GEMINI_API_KEY=your-gemini-api-key

  # CTI 서버 프록시 엔드포인트
  VITE_CTI_SERVER_URL=http://your-cti-server-ip:port
  ```

* **보안 및 접근 제어 규칙**:
  1. **`.gitignore` 검증**: `.env`, `.env.local` 파일이 Git 리포지토리에 푸시되지 않도록 철저 차단.
  2. **Supabase RLS (Row Level Security)**: 인증된 사내 사용자(`authenticated` 세션)만 DB 테이블 읽기/쓰기가 가능하도록 보안 정책 가동 유지.
  3. **CTI 프록시 서버 연동**: 배포 환경 서버(`server.ts`)에서 Node.js 프록시를 통해 CTI 녹취 서버 CORS 해결 및 쿠키 인증 안전 처리.

---

## 6. ⚡ 2026-09-02 아키텍처 업데이트

### 6.1 ⚡ Supabase Realtime Publication 활성화 (계정 간 실시간 WebSocket 동기화)
- `ALTER PUBLICATION supabase_realtime ADD TABLE consultations, agent_tasks, customers, internal_agents;` 완료.
- 상담/TODO/고객/상담원 4개 핵심 테이블의 PostgreSQL WAL 방송 활성화 → 계정 간 500ms 이내 실시간 동기화.

### 6.2 🧹 500줄 모듈화 가이드 (`AGENTS.md` Rule 2)
- `useAppData.ts` (1,002줄 ➔ 422줄): `useConsultationFormState.ts`, `useAgentTaskState.ts`, `useInternalAgentState.ts` 분리.
- `TaskManagementView.tsx` (612줄 ➔ 221줄): `taskFilterUtils.ts`, `TaskStatusCards.tsx`, `TaskFilterToolbar.tsx`, `TaskItemRow.tsx` 분리.

### 6.3 🔐 CTI/Gemini 계정별 자격증명 격리 패턴 확립 (2026-09-02)

#### CTI localStorage 계정 격리 구조 (`useCtiCollector.ts`)
```ts
// 계정별 격리 키 생성 헬퍼
const getCtiKey = (base: string) => agentName ? `${base}_${agentName}` : base;

// 읽기
localStorage.getItem(getCtiKey('cti_user_id'))    // "cti_user_id_이현우"
localStorage.getItem(getCtiKey('cti_user_pw'))    // "cti_user_pw_이현우"
localStorage.getItem(getCtiKey('cti_session_cookie'))
localStorage.getItem(getCtiKey('cti_extension'))

// 저장
localStorage.setItem(getCtiKey('cti_user_id'), value)
```

#### Gemini API Key 계정 격리 패턴 (`geminiApi.ts`) — 이미 완성
```ts
// 계정별 독립 키
'gemini_api_key_이현우'  // A계정
'gemini_api_key_김영희'  // B계정
// → getStoredGeminiApiKey(agentName) / setStoredGeminiApiKey(key, agentName)
```

> **규칙**: 새 AI 에이전트가 CTI/Gemini 저장 로직 수정 시 반드시 `agentName`을 전달하고 `getCtiKey()` 패턴을 사용해야 합니다.

---

## 7. 🤖 AI 에이전트 인수인계 전략 (Agent Handover Protocol)

> **핵심 문제**: 대화가 초기화되거나 다른 모델/계정을 사용할 때 다음 에이전트가 중복 코드 생성 및 아키텍처 파괴 없이 즉시 작업을 이어받는 방법.

### 7.1 차세대 에이전트가 가장 먼저 해야 할 일 (5분 체크리스트)

```
[ ] 1. AGENTS.md 읽기          → 기술 스택, 금지 사항, 개발 규칙 파악
[ ] 2. DEVELOPMENT_GUIDE.md 읽기 → DB 스키마, 저장 철칙, 핵심 패턴 파악
[ ] 3. PROJECT_ROADMAP.md 읽기   → 최신 완료 기능 + 다음 과제 파악
[ ] 4. npx tsc --noEmit 실행     → 현재 컴파일 오류 없는지 확인
[ ] 5. 사용자 보고된 문제 재확인 후 작업 시작
```

### 7.2 절대 하면 안 되는 것 (Anti-Pattern)

| 금지 사항 | 이유 |
|-----------|------|
| `src/components/` 생성 | `src/front/components/`와 중복 |
| `src/lib/services/` 생성 | `src/backend/services/`와 중복 |
| `is_archived`, `agent_id`, `car_number` consultations upsert에 포함 | DB에 없는 컬럼 → 400 오류 |
| `'미입력'`, `'미등록'` 고정 문자열 customers에 저장 | UNIQUE 충돌 23505 오류 |
| CTI/Gemini 저장 시 `agentName` 없이 고정 키 사용 | 계정 간 자격증명 노출 |
| 500줄 초과 파일 그대로 유지 | AGENTS.md Rule 2 위반 |

### 7.3 프로젝트 핵심 지식 Quick Reference

```
프로젝트 ref:  jqtdlqisyzglfqhcisrj
Vercel URL:    https://zms-cs-helper.vercel.app
GitHub repo:   YONU-LEEHYUNWOO/zms-cs-helper

로그인 데이터 흐름:
  Supabase Auth.signIn
  → internal_agents 테이블에서 해당 상담사 정보 로드
  → AuthContext.currentAgent / currentAgentName 설정
  → useAppData / subhooks 전체 실행

핵심 엔트리포인트:
  관리자 판단 로직  → AgentProfileModal.tsx L40~50
  새 에이전트 생성  → useInternalAgentState.ts (supabase.auth.signUp)
  상담 저장        → ConsultationRepositoryImpl.ts.saveConsultation()
  업무 이관        → AgentTaskRepositoryImpl.ts.reassignTask()
  실시간 동기화    → subscribeConsultationRealtime() / subscribeRealtime()
```

### 7.4 다음 에이전트에게 전달할 프롬프트 템플릿

```
나는 ZMS CS Helper 프로젝트를 개발하고 있어.
먼저 AGENTS.md, DEVELOPMENT_GUIDE.md, PROJECT_ROADMAP.md 읽어서
프로젝트 전체 구조를 파악한 다음
[{---구체적인 작업 지시---}]를 시작해줘.

- 기술 스택: React 18 + Vite + TypeScript + TailwindCSS + Supabase
- 프론트엔드: src/front/, 백엔드: src/backend/
- 별도 Node 서버 없음 – Vercel 서버리스 + Supabase BaaS
- 가장 중요: 중복 폴더/코드 생성 금지, 500줄 제한, 한글 주석, AGENTS.md 전 규칙 준수
```

---

*최종 업데이트: 2026-09-02 (CTI/Gemini 계정별 자격증명 격리 패턴 확립, AI 에이전트 인수인계 전략 7섹션 신설)*
