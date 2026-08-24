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

### 2-11. 🔑어드민 Supabase Auth 정식 회원가입 연동 & 관제 뷰 계정별 디폴트 필터링 (2026-08-21 완료)
* **Supabase Auth signUp 연동 (`AgentProfileModal.tsx`, `useAppData.ts`)**: 어드민 폼에서 이메일(`email`), 이름, 팀, 내선번호, 초기 비밀번호 입력 시 `supabase.auth.signUp` 및 DB 동시 저장하여 생성된 상담원 정식 로그인 지원.
* **어드민 샌드박스 보안 격리**: `🔄 샌드박스 계정 전환` 및 `🏢 상담사 명단 관리` 탭은 오직 최고 관리자 계정(`role === 'ADMIN'`)에만 노출.
* **전 관제 뷰 계정별 디폴트 필터링**: 데이터 마스터 DB (`DbViewerTab.tsx`), 업무 TODO (`TaskManagementView.tsx`), 칸반, 캘린더 등에서 로그인된 계정(`이현우`) 데이터 1순위 디폴트 관제 및 엑셀 다운로드 연동 완료.

---

## 3. 🚀 [다음 단계 과제] Phase 3.0 상용 배포 (Production Deployment) & 사내 URL 배포 전략

### 🌐 1단계: Vercel / Netlify 1클릭 클라우드 배포 (Deployment)
* **목적**: 빌드 결과물(`dist`)을 클라우드 CDN에 배포하여 팀원 누구나 접속 가능한 HTTPS SSL 고유 URL (예: `https://zms-cs-helper.vercel.app`) 생성.
* **실행 절차**:
  1. Git 저장소 최신 버전 커밋 & 푸시 (`git push origin main`).
  2. Vercel 로그인 ➔ `New Project` ➔ Git Repository 선택 후 Deploy 실행.

### 🔑 2단계: 배포 환경 변수 (`.env`) & API 키 중앙 세팅
* **Vercel / Netlify Environment Variables 메뉴 등록**:
  - `VITE_SUPABASE_URL`: Supabase 클라우드 URL
  - `VITE_SUPABASE_ANON_KEY`: Supabase 익명 API 키
  - `VITE_GEMINI_API_KEY`: Gemini Multimodal AI 오디오 요약 API 키
  - `VITE_CTI_SERVER_URL`: 사내 CTI 프록시 엔드포인트 URL
* **보안 검증**: `.env` 파일은 Git 추적 제외(`.gitignore`)로 보안 유지, Supabase RLS 정책 가동 유지.

### 👥 3단계: 사내 팀원 URL 전달 & 알파 실전 릴리즈
* **릴리즈 절차**: 생성된 Vercel URL을 사내 CS 팀원들에게 전달 ➔ 어드민 계정에서 신규 상담사 계정 생성 후 사내 배포 정식 가동.

### 📞 4단계: CTI 녹취 내선번호 ↔ 사내 상담사 계정 1:1 자동 매칭 표출 (`CtiAudioModal.tsx`, `LogsArchiveView.tsx`)
* **목적**: CTI 녹취 및 음성 분석 수신 목록에 표출되는 CTI 내선번호(예: `105`, `7997`) 옆에 `internal_agents` DB의 `extension_number`와 1:1 매칭되는 **실제 등록 상담사 이름(예: 👤 이현우 상담사건)**을 자동으로 시각적 표출하여 통화 주체를 즉각 식별 가능하도록 구현.

### 🚗 5단계: '차량 변경' 문의 선택 시 공유자 연락처 폼 활성화 & 3단계 전용 스텝퍼 구현 (`CenterCustomerForm.tsx`, `ProcessStepper.tsx`, 관제 뷰 전반)
* **목적**: DB 구조 변경 없이 기존 `consultations.owner_phone` 컬럼을 100% 재활용하여, 문의 유형 `차량 변경` 선택 시 **공유자 연락처 (`owner_phone`)** 입력 필드가 자연스럽게 활성화되도록 구현.
* **전용 3단계 스텝퍼**: 결제/부재 과정이 없는 `차량 변경` 특성에 맞춰 깔끔한 3단계 프로세스 적용 (1단계: 문의 접수 ➔ 2단계: 유관 부서/공급사 확인 중 ➔ 3단계: 처리 완료).
* **다방향 관제 연동**: 칸반 보드(`유선 부서 확인 중` 컬럼), 캘린더, 데이터 마스터 DB(`owner_phone` 열)에 공유자 연락처 및 3단계 진행 상태가 실시간 정합성 있게 표출되도록 처리.

---

## 4. 🟡 차세대 SaaS 고도화 과제 (Future Roadmap)

### 🌟 💡 [SaaS 고도화 1] 고객별 과거 전체 상담 이력 시각적 수직 타임라인 모달 (Customer History Timeline Viewer)
* **목적**: 0대 전제("과거에 어떤 상담 직원과 무슨 내용으로 통화했는지 즉각 추적")를 극대화.
* **구현 방안**: 전화 수신/검색 시 해당 고객의 전체 상담 및 CTI 통화 이력을 역연대순 수직 타임라인 모달로 1클릭 통합 제공.

### 🌟 💡 [SaaS 고도화 2] 계정 간 실시간 작업 충돌 방지 & 접속 상태 표시 (Realtime Presence & Soft Lock)
* **목적**: 동시 접속 시 동일 상담건 중복 편집 방지 (Soft Lock 배지 표출).

### 🌟 💡 [SaaS 고도화 3] 통화/상담 분석 통계 및 상담사 실적 대시보드 (Analytics & Report Dashboard)
* **목적**: 콜 수신량, 문의 유형 비율, 상담사별 처리 실적 시각화.

---

## 5. 📂 핵심 파일 위치 및 역할

| 기능 | 핵심 파일 | 설명 및 주의사항 |
|---|---|---|
| 탑바 & 알림/계정 드롭다운 | `src/front/components/navigation/TopNavBar.tsx` | **계정 프로필 단일화, 미확인/확인 서브 탭 분류, 🔔 알림 펄스 애니메이션** |
| 좌측 사이드바 | `src/front/components/navigation/LeftSidebar.tsx` | 메인 서브 메뉴 내비게이션, 하단 내 프로필 & 어드민 가입 모달 |
| 계정 프로필 & 어드민 모달 | `src/front/components/auth/AgentProfileModal.tsx` | **Supabase Auth signUp 연동, 샌드박스 전환(어드민 전용), 동적 권한 변경** |
| 업무 & TODO 관제 뷰 | `src/front/components/tasks/TaskManagementView.tsx` | 상단 KPI 카드 뷰 스위처, **내 계정 디폴트 필터링**, 태그/담당자/검색 필터 |
| 어드민 DB 데이터 마스터 | `src/front/components/admin/tabs/DbViewerTab.tsx` | **내 계정 디폴트 데이터 조회, DB 거울 테이블, 계정별 CSV 엑셀 다운로드** |
| 상담사 계정별 알림 훅 | `src/front/hooks/useNotifications.ts` | 계정별 저장소 격리, D-Day 알림 계산, 5초 주기 실시간 감지 타이머 |
| 주차/연장 동적 폼 | `src/front/components/workspace/CenterCustomerForm.tsx` | 주차 문의 & 연장 문의 차주/공유자/시작일 폼 확장 동기화 |
| 문의 프로세스 스텝퍼 | `src/front/components/workspace/ProcessStepper.tsx` | 주차 문의 & 연장 4단계 스텝퍼, 기타 3단계 스텝퍼 |
| 전역 마스킹 유틸리티 | `src/lib/utils/normalize.ts` | 임시 우회 식별자(`no-car-`, `no-phone-`) UI 마스킹 및 전화번호 표준화 |

---

*최종 업데이트: 2026-08-21 (Supabase Auth 어드민 신규 계정 가입 연동 및 상용 배포 로드맵 최신화 완료) / 담당 AI: Antigravity*
