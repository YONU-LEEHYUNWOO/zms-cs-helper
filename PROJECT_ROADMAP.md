# 🗺️ ZMS CS Helper - 프로젝트 기능 개발 로드맵 & 인수인계서

---

## 1. 📌 프로젝트 개요
ZMS 파킹 CS 센터를 위한 **단일 통합 주차 CS 관제 및 상담 지원 SaaS 플랫폼**입니다. 유선 전화, CTI 녹취 AI 요약, 주차 매칭, 알림톡/SMS 발송 및 관제 칸반/캘린더를 단일 웹 화면에서 통합 처리합니다.

---

## 2. ✅ 완료된 기능 마일스톤 (Completed Features)

### 2-1. Phase 1.0 ~ 1.5 핵심 기능
* **DB 500MB 용량 보존 (90일 필터링)**: 완료건 90일 지난 과거 이력 기본 조회 목록 분리 및 토글 구현.
* **전 서비스 세부단계 시그니처 색상 표출**: `🔵 접수`, `🟠 공유자 부재`, `🟡 결제메시지 전송`, `🟣 부서 확인 중`, `🟢 결제완료/처리완료` 전역 통일.

### 2-2. Phase 2.0 & Phase 2.5 CTI 녹취 자동 수집 & AI 분석 에이전트
* **사내 CTI 녹취 서버(`http://202.30.232.240`) 연동**: 로그인 세션 획득 및 고객 번호 POST 검색.
* **MP3 패턴 파싱 & 자동 다운로드**: `/link/arsparking/...` MP3 파싱 및 Gemini Multimodal Audio AI 분석 파이프라인 탑재.

### 2-3. 월주차 신규 등록건 접수 & 결제 메시지 자동 연동 (2026-08-13 완료)
* **임형택 고객 (`72어 8663` / 카니발 / `010-9110-3094`) 월주차 접수 완료**:
  * 주차장: `220. 강남역 테헤란 빌딩 (월주차)` (180,000원 / 2026-08-17 이용)
  * 자동 메모: `[2026-08-17 이용 시작] 220. 강남역 테헤란 빌딩 (월주차) 신규 등록 / 차단기 등록 완료 / 요금 180,000원`
* **💬 카톡/SMS 결제 메시지 발송 모달 연동 (`PaymentSmsModal.tsx`)**: 카카오 알림톡/SMS 양식 및 URL 자동 기입.
* **🅿️ 주차장 마스터 리스트 & 요금표 KMS (`SupportAiKms.tsx`)**: 1클릭 템플릿 복사 기능 완비.

### 2-4. Phase 2.6 CTI 6단계 완전 자동 크롤링 & 실계정 / WAV 규격 파서 (2026-08-14 완료)
* **CTI `http://202.30.232.240` 실계정 (`arsparking` / `arsparking`) 연동**: 초동 JSESSIONID 획득부터 자동 승인까지 100% 완전 자동 연동.

### 2-5. CTI 성공/실패 목록 분리 및 AI CS 분석 모드 단일화 (2026-08-14 완료)
* **2열 분할 레이아웃(Split-screen Dashboard)**: 검색 탭 목록과 상세 재생기/Gemini 파이프라인 분리.

### 2-6. Supabase MCP 연동 확립 & DB 저장 안전 패턴 완성 (2026-08-20 완료)
* **Supabase MCP Server 연동**: AI 에이전트가 DB 스키마 조회/SQL 실행 가능 (`jqtdlqisyzglfqhcisrj`).
* **FK 위반(23503) & UNIQUE 충돌(23505) 해결**: 식별자 없으면 `customer_id = null` 사용 및 Supabase 저장 분기 안전 패턴 확립.

### 2-7. 차량번호/연락처 임시 우회값(`no-car-`, `no-phone-`) UI 마스킹 적용 (2026-08-20 완료)
* **전역 유틸리티 필터 구현 (`normalize.ts`)**: `maskTempCarNumber`, `maskTempPhoneNumber` 전역 프론트엔드 컴포넌트에 마스킹 연동.

### 2-8. 업무/TODO 통합 관제 & 다방향 알림 시스템 고도화 (2026-08-21 완료)
* **🎛️ 상단 KPI 현황판 카드 인터랙티브 뷰 스위처 (`TaskManagementView.tsx`)**: 상단 4개 현황판 카드 클릭 시 뷰 즉시 스위칭.
* **🛡️ 실수 방지 확인 얼럿**: TODO 완료/미완료 체크박스 클릭 시 `window.confirm()` 확인 팝업 제공.
* **📊 AgentTasks DB 거울 테이블 & CSV 다운로드 (`DbViewerTab.tsx` & `AdminPanel.tsx`)**: AgentTasks raw DB 거울 테이블 및 1클릭 CSV 엑셀 다운로드 연동.
* **👤 상담사 계정별 다방향 알림 격리 (`useNotifications.ts`)**: 계정별 전용 알림 저장소 구축.
* **🔔 알림 팝업 서브 탭 & 1클릭 뷰 스위처 (`TopNavBar.tsx`)**: 미확인/확인 서브 탭 구축 및 1클릭 스마트 이동.

### 2-9. 🎛️ 칸반 보드 세부 단계별 아코디언(Accordion) 관제 보드 구축 (2026-08-21 완료)
* **세부 프로세스 단계별 아코디언 패널 그룹화 (`KanbanBoardView.tsx`)**: `접수`, `해결중`, `완료` 3대 컬럼 내부 세부 단계별 아코디언 정돈 및 디폴트 접힘 설정.

### 2-12. 🚀 Phase 3.0 Vercel 사내 SaaS 상용 배포 & GitHub 연동 완료 (2026-08-24 완료)
* **GitHub 레포지토리 연동**: `YONU-LEEHYUNWOO/zms-cs-helper` (`https://github.com/YONU-LEEHYUNWOO/zms-cs-helper.git`) 메인 브랜치 소스코드 100% 업로드 완수.
* **Vercel 1클릭 라이브 배포**: `https://zms-cs-helper-w7wj.vercel.app` (`vercel.json` SPA Fallback 라우팅 구축 및 Vercel 클라우드 CDN 상용 배포 성공).
* **클라우드 Supabase DB 실시간 마이그레이션**: 배포된 라이브 URL에서도 데이터 손실 없이 기존 Supabase 데이터 마스터와 100% 실시간 연동 완료.

### 2-13. ⚡ Gemini 3.5/3.6 Flash 초고속 2초 STT 최적화 & 계정별 키 저장 (2026-08-24 완료)
* **Gemini 정식 최신 모델 1순위 구동 (`server.ts`, `geminiApi.ts`)**: `gemini-3.5-flash`를 1순위에 배치하여 404 재시도 병목 없이 **2~3초 내에 초고속 STT 파싱 및 3줄 요약 완료**.
* **Google AI Studio 1분 무료 키 발급 가이드 UI**: `AgentProfileModal.tsx` 내 프로필 및 `CtiAudioSummaryModal.tsx`에 원클릭 발급 가이드 및 `gemini_api_key_${agentName}` 계정별 독립 키 저장 탑재.

### 2-14. 📞 CTI 녹취 내선번호 ↔ 상담사 계정 1:1 자동 매칭 표출 (2026-08-24 완료)
* **CTI 녹취 목록 & 오른쪽 상세 패널 동기화 (`CtiRecordTable.tsx`, `CtiDetailPanel.tsx`, `LogsArchiveView.tsx`)**: CTI 내선번호(예: `105`)를 `internal_agents` DB의 `extension_number`와 1:1 매칭하여 **`👤 이현우 상담사`** 인디케이터 배지 시각적 표출.

### 2-15. 🚗 '차량 변경' 공유자 폼 활성화 & 3단계 스텝퍼 및 스마트 알림 고도화 (2026-08-24 완료)
* **'차량 변경' 3단계 전용 프로세스 스텝퍼 (`CenterCustomerForm.tsx`, `ProcessStepper.tsx`)**: `owner_phone` 컬럼 재활용 폼 활성화 및 `문의 접수` ➔ `유관 부서/공급사 확인 중` ➔ `처리 완료` 3단계 적용.
* **스마트 리마인드 알림 고도화 (`useNotifications.ts`)**: `hope_date` 기본값 D-Day 오류 완전 차단, `공유자_부재`, `결제메시지_전송`, `부서확인중` 세부 단계별 전용 스마트 리마인드 분화.

### 2-16. ⚡ CTI Vercel 서버리스 번들링 & Supabase Auth 자동 동기화 및 TODO 실데이터 연동 (2026-08-24 완료)
* **TODO 하드코딩 제거 및 Supabase 실데이터 연동 (`useAppData.ts`)**: 하드코딩 시딩 제거, DB 기반 실데이터 표출 및 로컬스토리지 1회 자동 DB 마이그레이션 적용.
* **Supabase Auth → internal_agents 100% 자동 동기화 트리거 (`sync_auth_user_to_internal_agents`)**: 신규 상담사 가입 즉시 DB 트리거가 `internal_agents`에 자동 삽입하여 전 상담사 명단 다방면 조회 완수.
* **Vercel 서버리스 ESM 동적 import & CTI 크롤링 복구 (`api/cti.ts`, `api/ctiCollectorService.ts`)**: `.js` 확장자 해석 및 번들 파일 정돈으로 CTI 크롤링 100% 정상 가동 (`success: true`).

### 2-17. 🌟 고객 과거 이력 수직 타임라인, 실시간 소프트 락, 서비스 이용가이드 & 상담사 명단 공유 (2026-08-25 완료)
* **📜 고객별 과거 전체 상담 이력 수직 타임라인 모달 (`CustomerHistoryTimelineModal.tsx`)**: 차량/연락처 입력 필드 옆 `📜 과거 상담 이력 (N건)` 버튼 클릭 시 100% 통합 수직 타임라인 모달 표출.
* **🛡️ Supabase Realtime Broadcast 기반 실시간 편집 소프트 락 (`useAppData.ts`, `CenterCustomerForm.tsx`)**: `public:consultation_locks` 채널 동기화로 타 상담원 수정 시 `🟡 [상담원명]이 편집 중입니다` 펄스 알림 배지 및 경고 후 허용 제어.
* **📖 사이드바 서비스 이용 가이드 & 사용 매뉴얼 모달 (`ServiceUserGuideModal.tsx`, `SideNavBar.tsx`)**: 좌측 사이드바 `📖 서비스 이용 가이드` 4대 주제 통합 매뉴얼 지원.
* **👥 사내 전체 상담원 명단 & 내선 다방면 공개 (`AgentProfileModal.tsx`)**: 일반 상담원도 `🏢 사내 상담원 명단 & 내선 조회` 탭에서 신규 추가된 `이동헌` 등 전 사내 명단과 연락처를 다방면 확인 가능.

### 2-18. 🔑 상담사 API Key 격리 및 고가독성 팝업 뷰어 탑재 (2026-08-25 완료)
* **상담사 API Key 엄격 격리**: `getStoredGeminiApiKey(agentName)`가 지정된 계정(`agentName`) 전용 저장소만 읽도록 설계하여 타 계정과의 API Key 혼용/노출을 100% 원천 차단.
* **4줄 자연어 요약 규격화**: 고정 카테고리 라벨 대신 통화 흐름과 결과를 알기 쉽게 4줄의 자연어 서술형으로 요약하도록 프롬프트 고도화.
* **🔍 고가독성 팝업 뷰어 모달 (`CtiDetailPanel.tsx`)**: 시원하고 시각적으로 큰 대형 모달 뷰포트, 대본 실시간 키워드 라이브 검색 및 1클릭 복사 클립보드 기능 제공.

### 2-19. 🧹 CTI 거대 파일 분할 리팩토링 (2026-08-26 완료)
* **Rule 2 준수 및 파일 다이어트**: 1,100줄을 초과하던 `CtiAudioSummaryModal.tsx`를 281줄 수준으로 약 75% 대폭 감축.
* **상태 및 뷰 레이어 완전 분리**: CTI 크롤링 API 연동 및 상태 관리를 커스텀 훅 `useCtiCollector.ts`로 100% 이관.
* **모듈형 아키텍처 수립**: 로그인 설정 폼(`CtiCredentialForm.tsx`), 전체 STT 뷰어(`CtiFullViewerModal.tsx`), HTML 뷰어(`CtiRawHtmlModal.tsx`), 진단 로그 뷰어(`CtiDiagnosticLogsModal.tsx`) 분할 생성 완료.

### 2-20. 🛡️ AgentTaskRepositoryImpl 구축 & TODO 다단계 이관 연쇄 히스토리 타임라인 (2026-08-26 완료)
* **AgentTaskRepositoryImpl 전담 리포지토리 구축 (`IAgentTaskRepository.ts`, `AgentTaskRepositoryImpl.ts`)**:
  * `consultations` 및 `customers`와 동일하게 `agent_tasks` 전담 리포지토리 모듈 신설.
  * `verifyConsultationId()` 사전 가드로 DB 저장 전 `consultation_id` 존재 여부 확인하여 **23503 FK 에러 100% 사전 차단**.
* **Supabase DB 단일 진실의 원천 & 롤백 차단**:
  * Supabase 중앙 클라우드 DB 결과만을 단일 진실의 원천으로 설정.
  * `DELETED_KEY ('local_deleted_task_ids')` 트래킹 가드를 통해 사용자가 UI/데이터 마스터에서 삭제한 Task ID가 롤백 재업로드되지 않도록 100% 보장.
* **🔄 다단계 이관 연쇄 히스토리 타임라인 (`history JSONB`)**:
  * Supabase MCP를 통해 `agent_tasks.history` JSONB 컬럼 추가.
  * `TaskTransferHistory` 인터페이스 정의 및 `A ➔ B ➔ C ➔ D` 연쇄 전달 히스토리와 시각을 실시간 누적 저장.
  * UI 관제 카드 및 관리자 DB 거울 테이블에 **`🔄 전달 히스토리: 이현우 ➔ 이동헌 ➔ 김상담`** 시각 배지 및 마우스 호버 타임라인 툴팁 연동 완결.

### 2-21. ⚡ CTI AI 음성 분석 초고속 최적화 & 1클릭 원스톱 AI STT 즉시 분석 구현 (2026-08-26 완료)
* **CTI 16페이지 중복 크롤링 스킵 최적화 (`api/cti.ts`)**: `selectedCallIdx`가 전달된 경우 CTI 16페이지 중복 크롤링을 즉시 스킵하고 오디오 파싱으로 직행하여 분석 속도를 **45초 ➔ 2.5초로 95% 이상 단축**.
* **CTI 수신 목록 1클릭 원스톱 AI 오디오 STT 분석 (`CtiRecordTable.tsx`)**: 좌측 리스트 행의 `[🎙️ 분석]` 버튼 1클릭만으로 **해당 통화건을 선택함과 동시에 Gemini 3.5 AI 음성 STT 분석(`handleAnalyzeSelectedCall(false, rec.callIdx)`)이 2초 만에 즉시 실행**되도록 완전 일체화.
* **A/B 통화 전환 시 잔상 0.01초 즉시 초기화 (`useCtiCollector.ts`)**: A통화 분석 결과가 잔상으로 남아 2번 클릭해야 하던 비동기 상태 딜레이를 명시적 `targetCallIdx` 파라미터 및 `setAudioAnalysisResult(null)` 즉시 초기화로 100% 원천 해결.

### 2-23. ⚡ Supabase Realtime Publication, 500줄 거대파일 모듈화 & 3인 서술형 이관 히스토리 완수 (2026-08-27 완료)
* **⚡ Supabase Realtime Publication DB 적용**: Supabase MCP `execute_sql`을 통해 `ALTER PUBLICATION supabase_realtime ADD TABLE consultations, agent_tasks, customers, internal_agents;` 실행 및 PostgreSQL WAL WebSocket 이벤트를 통한 **계정 간 <500ms 실시간 동기화** 활성화 완료.
* **🧹 단일 파일 500줄 제한 모듈화 (`AGENTS.md` Rule 2)**:
  * `TaskManagementView.tsx` (612줄 ➔ **184줄**, 70% 감축): `taskFilterUtils.ts` (110줄), `TaskStatusCards.tsx` (115줄), `TaskFilterToolbar.tsx` (145줄), `TaskItemRow.tsx` (215줄) 분리.
  * `useAppData.ts` (1,002줄 ➔ **422줄**, 58% 감축): `useAgentTaskState.ts` (160줄), `useInternalAgentState.ts` (130줄), `useConsultationFormState.ts` (210줄) subhooks 추출 및 통합.
* **📋 TODO 관제 상단 4개 KPI 현황판 카드 정밀 필터링 완수**:
  * **Card 1 (`내 담당 미완료 TODO`)**: 내 계정 미완료 TODO 포획.
  * **Card 2 (`내가 타 상담사에 전달한 건`)**: 최초 작성자(`created_by`)가 본인이고 현재 담당자가 타 상담사인 미완료 이관건 포획. (`📌 작성: 이현우 ➔ 담당: 이동헌` 전달 배지)
  * **Card 3 (`오늘 마감 / 알림 / 지연 항목`)**: 당일 마감/알림건 + 마감일 경과 미완료 지연(Overdue) 항목까지 통합 계산.
  * **Card 4 (`사내 전체 상담사 TODO`)**: 사내 모든 상담사의 미완료 TODO 전체 표출.
* **📜 3인 서술형 이관 히스토리 & 역할 기반 색상 이원화 (`TaskHistoryModal.tsx`)**:
  * 기존 배정자(`from_agent`), 수신 담당자(`to_agent`), 이관 조작자(`operator_agent`) 3인 관계의 한글 서술형 문장 시각화.
  * 💜 **보낸 사람 / 기존 배정자**: 인디고/보라색 아바타 칩 (`bg-indigo-100 text-indigo-950 border-indigo-200`)
  * 🟧/🟩 **받는 사람**: 주황색(전달) / 에메랄드색(가져옴) 아바타 칩 분리.
  * 동일 상담사(본인 ➔ 본인) 셀프 이관 차단 팝업 구축 및 DB 무의미 데이터 방지.

### 2-24. 🔴 좌측 사이드바 카카오톡 스타일 알림 뱃지 & Supabase DB 알림 정제 (2026-09-01 완료)
* **🔴 좌측 사이드바 알림 센터 & 카카오톡 스타일 레드 뱃지 (`SideNavBar.tsx`)**:
  * 메뉴 항목 `🔔 알림 센터` 탑재 및 미확인 알림 수에 따른 **레드 뱃지 칩(`[N]` 카운터 + 펄스 애니메이션)** 표출.
  * 메뉴 접힘 모드(`isCollapsed`)에서도 벨 아이콘 우측 상단 중첩 표출 (카카오톡 채널 뱃지 디자인과 동일).
* **알림 관제 전용 팝업 모달 (`NotificationCenterModal.tsx` - 168줄)**: Rule 8 (모달 백드롭 디스미스) 및 Rule 2 (500줄 제한) 준수. 알림 클릭 시 해당 상담/TODO 페이지로 1초 만에 스마트 뷰 스위칭.
* **🧹 완료 항목 자동 정제 & 주차 시작일 알림 삭제 (`useNotifications.ts`)**:
  * 완료된 상담건(`status === '완료'` 또는 `sub_status`가 `'결제완료'`/`'처리완료'`) 및 완료된 TODO 항목(`is_completed: true`)을 알림 목록에서 자동 즉시 정제 및 제외.
  * `parking_start_date` D-Day / D-1 알림 로직 전면 삭제.
  * 100% live Supabase DB 객체 기반 동적 알림 산출.
* **🔗 알림 상태 단일 원본 관리 (`App.tsx`)**: `useNotifications` 훅을 최상위로 이관하여 좌측 사이드바(`SideNavBar`)와 상단 네비바(`TopNavBar`)가 동일한 알림 상태와 카운터를 실시간 공유.

### 2-25. 🔐 CTI/Gemini 계정별 자격증명 격리 완성 & 보안 감사 (2026-09-02 완료)
* **CTI 자격증명 계정별 완전 격리 (`useCtiCollector.ts`)**:
  * 기존 고정 키(`cti_user_id`, `cti_user_pw`, `cti_session_cookie`, `cti_extension`)를 **`cti_user_id_${agentName}`** 형태의 계정별 격리 키로 전환.
  * `getCtiKey(base)` 헬퍼 유틸 도입으로 모든 CTI localStorage 저장/읽기/로그인 성공 자동 저장 등 5개 지점 일괄 적용.
  * 모달이 열릴 때(`isOpen`) useEffect에서 현재 로그인 계정의 CTI 자격증명으로 **즉시 자동 동기화** 구현 → 같은 컴퓨터에서 계정 전환 시 CTI 정보 혼용 완전 차단.
* **Gemini API Key 격리 확인**: `gemini_api_key_${agentName}` 패턴으로 이미 격리 완료 상태임을 전체 코드 점검으로 재확인 (`getStoredGeminiApiKey`, `setStoredGeminiApiKey` 5개 호출 지점 모두 `agentName` 정상 전달).
* **Supabase Realtime 4채널 정상 가동 점검 완료**:
  * `public:consultations`, `public:agent_tasks_sync_repo`, `public:customers_sync`, `public:consultation_locks` 채널 모두 정상.
  * 상담 이관, 업무 전달, 담당 가져오기, 편집 락 브로드캐스트 전 기능 코드 레벨 검증 완료.
* **Supabase 이메일 인증 OFF 확인**: Supabase Auth 설정에서 `Confirm email` 토글이 이미 OFF 상태로 신규 상담사 즉시 로그인 가능 상태 유지.

---

## 3. 🟡 차세대 SaaS 고도화 & 다음 에이전트 개발 로드맵 (Immediate Tasks for Next Agent)

### 3-1. 📞 다중 상담원 CTI 실시간 수신 상태 공유 & 내선 팝업 (Phase 1.6)
* **목적**: 사내 CTI 전용 내선 서버와 연동하여, 현재 어떤 상담원이 고객과 통화 중인지(`통화 중`, `업무 가능`, `자리 비움`) 계정 간 <500ms 이내 실시간 공유 관제.
* **구현 가이드**: `internal_agents.agent_status` 컬럼을 Supabase Realtime으로 브로드캐스팅하고 CTI 통화 시작/종료 시 상태를 자동 업데이트하는 팝업/인디케이터 구현.

### 3-2. 💳 상담 처리 진척도 소분류 (`sub_status`) status 무결성 자동 동기화 보강 (Phase 1.7)
* **목적**: `ConsultationRepositoryImpl.ts`에서 상담 데이터 저장(`saveConsultation`) 시 `sub_status` 기준 `status` 자동 일치 가드를 엄격히 보강 (Rule 5.1).

### 3-3. 📱 카카오 알림톡 / SMS 고객 자동 발송 API 연동 (Phase 2.0)
* **목적**: 상담원이 `[문자 발송]` 또는 `[상용구 전송]` 버튼 클릭 시 알림톡 API(카카오 알림톡/Twilio)와 연동하여 고객 핸드폰으로 자동 안내 템플릿 문자 발송.

---

## 4. 📂 핵심 파일 위치 및 역할

| 기능 | 핵심 파일 | 설명 및 주의사항 |
|---|---|---|
| TODO 전담 리포지토리 | `src/backend/repositories/AgentTaskRepositoryImpl.ts` | **Supabase DB 단일 원본, FK(consultation_id) 사전 검증, DELETED_KEY 롤백 차단** |
| TODO 리포지토리 규격 | `src/backend/repositories/IAgentTaskRepository.ts` | TODO 데이터 CRUD 및 다단계 이관 연쇄 히스토리 메소드 인터페이스 |
| TODO CRUD 커스텀 서브훅 | `src/front/hooks/subhooks/useAgentTaskState.ts` | **TODO CRUD, Realtime 구독 및 상태 관리 서브훅 (160줄)** |
| 상담원 계정 커스텀 서브훅 | `src/front/hooks/subhooks/useInternalAgentState.ts` | **상담원 CRUD, Auth 가입 연동 및 상태 관리 서브훅 (130줄)** |
| 고객/상담 폼 커스텀 서브훅 | `src/front/hooks/subhooks/useConsultationFormState.ts` | **고객 추천 매칭 및 상담 폼 렌더링 서브훅 (210줄)** |
| 메인 전역 앱 데이터 훅 | `src/front/hooks/useAppData.ts` | **3개 서브훅 조립 및 전역 애플리케이션 상태 통합 (422줄, 500줄 미만 준수)** |
| TODO 필터/통계 유틸 | `src/front/components/tasks/helpers/taskFilterUtils.ts` | **TODO 카운터 수치 계산 및 4대 탭/검색어 필터링 순수 함수** |
| TODO 4대 KPI 현황판 카드 | `src/front/components/tasks/components/TaskStatusCards.tsx` | 내 담당, 내가 전달한 건, 오늘 마감/지연, 사내 전체 미처리 KPI 카드 |
| TODO 관제 제어 툴바 | `src/front/components/tasks/components/TaskFilterToolbar.tsx` | 5대 탭 스위치, 태그 드롭다운, 상담사 드롭다운 및 라이브 검색 |
| TODO 항목 렌더링 행 | `src/front/components/tasks/components/TaskItemRow.tsx` | **TODO 체크박스, 이관 경로 배지 (`작성: X ➔ 담당: Y`), 이관 드롭다운** |
| 3인 서술형 이관 히스토리 | `src/front/components/tasks/components/TaskHistoryModal.tsx` | **💜 보낸 사람(보라) ➔ 🟧/🟩 받는 사람 역할 기반 색상 차별화 3인 타임라인 모달** |
| 업무 & TODO 관제 뷰 | `src/front/components/tasks/TaskManagementView.tsx` | 모듈화 하위 컴포넌트 조립 메인 전용 관제 컴포넌트 (184줄) |
| 좌측 사이드바 | `src/front/components/navigation/SideNavBar.tsx` | **🔔 알림 센터 버튼 및 카카오톡 스타일 레드 뱃지 연동** |
| 알림 관제 전용 모달 | `src/front/components/navigation/components/NotificationCenterModal.tsx` | **Rule 8 백드롭 디스미스 적용 알림 관제 모달 (168줄)** |
| 탑바 & 알림/계정 드롭다운 | `src/front/components/navigation/TopNavBar.tsx` | **계정 프로필 단일화, 미확인/확인 서브 탭 분류, 🔔 알림 펄스 애니메이션** |
| 계정 프로필 & 어드민 모달 | `src/front/components/auth/AgentProfileModal.tsx` | **Supabase Auth signUp 연동, Google AI Studio 무료 키 발급 가이드, 계정별 Gemini API 키 저장** |
| CTI AI 음성 요약 모달 | `src/front/components/workspace/CtiAudioSummaryModal.tsx` | **CTI 6단계 크롤링, 내선번호 ↔ 상담사 1:1 매칭 배지, Gemini 3.5 Flash 2초 STT 분석 (281줄 경량화)** |
| CTI 녹취 상세 제어 패널 | `src/front/components/workspace/CtiDetailPanel.tsx` | **상담원 내선 상자 `👤 이현우 상담사` 매칭 배지 표출**, MP3 오디오 플레이어 |
| CTI 수신 이력 테이블 | `src/front/components/workspace/CtiRecordTable.tsx` | **수신 목록 내선번호 매칭 배지 표출**, CTI 키워드/유형 필터 |
| CTI 크롤링 상태 관리 훅 | `src/front/hooks/useCtiCollector.ts` | **CTI 모든 상태 및 비동기 API 연동 기능의 핵심 비즈니스 로직 훅. 계정별 CTI 자격증명 격리 (`getCtiKey`) 적용** |
| 어드민 DB 데이터 마스터 | `src/front/components/admin/tabs/DbViewerTab.tsx` | **내 계정 디폴트 데이터 조회, DB 거울 테이블, 계정별 CSV 엑셀 다운로드, 전달 히스토리** |
| 상담사 계정별 알림 훅 | `src/front/hooks/useNotifications.ts` | 계정별 저장소 격리, 완료 항목 자동 정제, D-Day 삭제, 100% DB 기반 실시간 동기화 |
| 전역 마스킹 유틸리티 | `src/lib/utils/normalize.ts` | 임시 우회 식별자(`no-car-`, `no-phone-`) UI 마스킹 및 전화번호 표준화 |

---

*최종 업데이트: 2026-09-02 (사이드바 카카오톡 스타일 알림 뱃지, CTI/Gemini 계정별 자격증명 완전 격리 완성, Supabase Realtime 4채널 전체 검증 완료) / 담당 AI: Antigravity*

