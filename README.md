# 🚗 ZMS CS Helper - 사내 통합 주차 CS 관제 & AI 음성 분석 SaaS 플랫폼

> **ZMS 파킹 CS 센터 상담 업무 통합 관제 시스템**  
> 유선 전화/카카오톡 문의 파편화, 녹취 확인 창구 분산, 리마인더 부재로 인한 업무 누락을 완전히 타파하기 위해 개발된 **사내 통합 CS 관제 SaaS 플랫폼**입니다.

🌐 **라이브 서비스 접속 주소**: [https://zms-cs-helper-w7wj.vercel.app](https://zms-cs-helper-w7wj.vercel.app)

---

## 1. 💡 "왜 이 서비스를 기획하고 만들었나요?" (기획 배경)

### 🔴 기존 업무 방식의 한계 (As-Is)
- **상담 내역 파편화**: 상담사별로 개인 메모장이나 엑셀에 적어두어 "누가 어떤 고객과 무슨 내용을 상담했는지" 팀 내 공유 불가능
- **리마인더 부재로 인한 업무 누락**: "몇 시까지 공유자/고객에게 재통화하겠다"는 약속 관리 기능이 없어 팔로우업 누락 및 응대 구멍 발생
- **분산된 정보 창구 & 잦은 창 전환**: CTI 녹취 서버 웹사이트(`http://202.30.232.240`), 카카오 관리자창 등을 별도로 켜야 해서 신속한 정보 확인 및 고객 대응에 한계 존재

### 🟢 해결책 (To-Be)
- 정보 파편화와 업무 누락을 완전히 타파하기 위한 **단일 통합 CS 관제 & AI 음성 분석 서비스 `ZMS CS Helper`** 구축!
- 한 화면에서 유선 전화/카톡 통합 접수, CTI 녹취 2초 Gemini AI 음성 분석, 계정 간 실시간 이관, 다방향 알림 & TODO 관제 지원.

---

## 2. 🎯 핵심 기능 4가지 포인트

1. **🖥️ 3분할 통합 상담 워크스페이스**:
   - 메모 Pad + @상담사 멘션 토스 + 정밀 차종 폼(경차/세단 소중대/SUV/RV) + `📜 과거 상담 이력 (N건)` 수직 타임라인 모달 + `🟡 [상담원명]이 편집 중입니다` 실시간 소프트 락
2. **🎙️ CTI 1클릭 Gemini AI 음성 분석**:
   - 별도 CTI 웹사이트 오픈 없이 **[🎙️ 분석] 버튼 1클릭으로 2초 만에 Gemini 3.5 AI 음성 STT 파싱 및 4줄 요약**
   - 통화 목록 내 CTI 내선번호(예: `105`) ↔ 사내 상담사 자동 매칭 **`👤 이현우 상담사`** 인디케이터 표출
3. **☑️ 업무 & TODO 리마인더 & 계정 간 실시간 이관**:
   - 카카오톡 스타일 알림 센터(레드 뱃지 `[N]`) + 4대 KPI 현황판 카드 + 1클릭 **`[담당 상담원 지정/이관]`** (상담 및 TODO 소유권 즉시 실시간 이관)
4. **🛡️ 사내 실시간 다방향 소통 & 보안**:
   - Supabase Realtime WebSocket 기반 계정 간 `<500ms` 실시간 동기화 + 최고 관리자(`role === 'ADMIN'`) 전용 데이터 마스터 접근 제한 (`isAdminAgent`)

---

## 3. 📂 프로젝트 문서 가이드 (Documentation)

- 📄 **서비스 상세 기획 배경 & 소개**: [`docs/SERVICE_OVERVIEW.md`](./docs/SERVICE_OVERVIEW.md)
- 📖 **사내 사용자 & 어드민 통합 매뉴얼**: [`DEVELOPMENT_GUIDE.md`](./DEVELOPMENT_GUIDE.md) (또는 `docs/USER_MANUAL.md` 참고)
- 🗺️ **기능 개발 로드맵 & 인수인계서**: [`PROJECT_ROADMAP.md`](./PROJECT_ROADMAP.md)

---

## 4. 🛠️ 기술 스택 (Tech Stack)

- **프론트엔드**: React 18 + Vite + TypeScript + Tailwind CSS + Lucide React
- **백엔드/DB**: Supabase (PostgreSQL, Realtime DB, Auth) + LocalStorage 이중 캐시
- **서버리스 API / 프록시**: Express (`server.ts`) / Vercel Serverless (`api/cti.ts`)
- **AI 오디오 엔진**: Google Gemini 3.5 / 3.6 Multimodal Audio API
- **배포 플랫폼**: Vercel (`https://zms-cs-helper-w7wj.vercel.app`)

---

## 5. 💻 로컬 개발 환경 실행 (Run Locally)

```bash
# 1. 패키지 설치
npm install

# 2. 로컬 개발 서버 실행
npm run dev

# 3. CTI 프록시 & API 서버 실행 (필요시)
npm run server
```

---

*최종 업데이트: 2026-09-03 / ZMS CS Helper 기획 및 개발팀*