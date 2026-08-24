/**
 * ZMS CS Helper - 상담 데이터 생명주기 및 90일 보관 이력 유틸리티
 * 
 * [역할]
 * - DB 무료 플랜 (500MB 한도) 및 부팅 메모리 최적화를 위해 완료 후 90일이 경과한 데이터 판별
 * - 데이터를 DB에서 삭감/삭제하는 것이 아니며, 기본 조회 목록 필터링에 사용됨
 * 
 * [날짜 및 상태 처리 규칙]
 * - hope_date (상담 일자)와 parking_start_date (희망 주차 시작일), created_at/updated_at 파싱
 * - sub_status (세부 프로세스 단계)와 status (대분류) 간 100% 무결성 동기화 (getResolvedStatus)
 * - 전 서비스(탑바 검색, 칸반, 캘린더, 어드민 DB 마스터, 아카이브) 1:1 시그니처 색상 통합 (getSubStatusBadgeStyle)
 * - KST (Asia/Seoul, 한국 표준시 UTC+9) 기준으로 24시간제 HH:mm 표출
 */

import { Consultation, ConsultationStatus } from '../../backend/types';

/**
 * sub_status 값(결제완료, 처리완료 등)을 사람이 읽기 쉬운 통합 표기 텍스트로 변환
 */
export function formatSubStatus(subStatus?: string | null): string {
  if (!subStatus) return '-';
  const clean = subStatus.replace(/[^0-9a-zA-Z가-힣]/g, '').replace(/메세지/g, '메시지');
  if (clean === '결제완료' || clean === '처리완료') {
    return '결제완료/처리완료';
  }
  if (clean === '공유자부재' || clean === '공유자연락중') {
    return '공유자 부재';
  }
  if (clean === '결제메시지전송') {
    return '결제 메시지 전송';
  }
  if (clean === '부서확인중' || clean === '유선부서확인중' || clean === '유관부서확인중' || clean === '유관부서공급사확인중') {
    return '유관 부서/공급사 확인 중';
  }
  if (clean === '해결중') {
    return '일반 해결 진행 중';
  }
  return subStatus;
}

/**
 * 세부 프로세스 단계(sub_status)에 따른 전 서비스 통합 시그니처 배지 스타일 반환
 * - 🔵 파란색: 접수 / 문의접수
 * - 🩷 로즈/핑크: 공유자 부재 / 공유자 연락중 (호박색과 시각적 구분 강화)
 * - 🟡 호박색: 결제 메시지 전송
 * - 🟣 보라색: 부서 확인 중 / 유선 부서 확인 중
 * - 🟢 에메랄드: 결제 완료 / 처리 완료 (결제완료/처리완료)
 */
export function getSubStatusBadgeStyle(subStatus?: string | null): string {
  if (!subStatus) return 'bg-slate-100 text-slate-700 border-slate-200';
  const clean = subStatus.replace(/[^0-9a-zA-Z가-힣]/g, '').replace(/메세지/g, '메시지');

  // 1. 완료 단계: 에메랄드 / 그린 (🟢)
  if (clean === '결제완료' || clean === '처리완료') {
    return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
  }
  // 2. 결제 메시지 전송: 호박색 / 노란색 (🟡)
  if (clean === '결제메시지전송') {
    return 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
  }
  // 3. 부서 확인 중 / 유선 부서 확인 중: 퍼플 / 보라색 (🟣)
  if (clean === '부서확인중' || clean === '유선부서확인중') {
    return 'bg-purple-100 text-purple-800 border-purple-300 font-bold';
  }
  // 4. 공유자 부재 / 공유자 연락 중: 로즈 / 핑크색 (🩷 - 기존 오렌지와 헷갈림 해소)
  if (clean === '공유자부재' || clean === '공유자연락중') {
    return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
  }
  // 5. 신규 접수 / 문의 접수: 파란색 (🔵)
  if (clean === '접수' || clean === '문의접수') {
    return 'bg-blue-100 text-blue-800 border-blue-300 font-bold';
  }

  return 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
}

/**
 * 문의 유형(inquiry_type)에 따른 전용 시각적 뱃지 스타일 반환
 * - 주차 문의 ➔ 파란색 (indigo)
 * - 결제/환불 ➔ 핑크/장미색 (rose)
 * - 연장 ➔ 보라색 (purple)
 * - 차량 변경 ➔ 호박색 (amber)
 * - 기타 ➔ 회색 (slate)
 */
export function getInquiryTypeBadgeStyle(inquiryType?: string | null): string {
  if (!inquiryType) return 'bg-slate-100 text-slate-700 border-slate-200';
  const clean = inquiryType.trim();

  if (clean === '주차 문의' || clean === '주차장 위치 문의') {
    return 'bg-indigo-100 text-indigo-800 border-indigo-200';
  }
  if (clean === '결제/환불') {
    return 'bg-rose-100 text-rose-800 border-rose-200';
  }
  if (clean === '연장') {
    return 'bg-purple-100 text-purple-800 border-purple-200';
  }
  if (clean === '차량 변경') {
    return 'bg-amber-100 text-amber-800 border-amber-200';
  }
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

/**
 * Consultation의 sub_status 및 status를 조합하여 실효 대분류 status(접수 / 해결중 / 완료)를 결정
 */
export function getResolvedStatus(c: Consultation): ConsultationStatus {
  if (!c) return '접수';
  const sub = (c.sub_status || '').trim();
  const status = (c.status || '').trim();

  // 1. sub_status 값을 정밀 분석하여 대분류 맵핑
  if (sub) {
    const cleanSub = sub.replace(/[^0-9a-zA-Z가-힣]/g, '').replace(/메세지/g, '메시지');
    if (cleanSub === '결제완료' || cleanSub === '처리완료') {
      return '완료';
    }
    if (
      cleanSub === '공유자부재' ||
      cleanSub === '결제메시지전송' ||
      cleanSub === '부서확인중' ||
      cleanSub === '유선부서확인중' ||
      cleanSub === '공유자연락중' ||
      cleanSub === '해결중'
    ) {
      return '해결중';
    }
    if (cleanSub === '접수' || cleanSub === '문의접수') {
      return '접수';
    }
  }

  // 2. sub_status에서 분기 처리가 안되었거나 빈 값인 경우, DB의 status 컬럼 값을 최종 신뢰하여 반환
  if (status === '완료') return '완료';
  if (status === '해결중') return '해결중';
  if (status === '접수') return '접수';

  return '접수'; // 기본 폴백
}

/**
 * ISO 날짜 또는 타임스탬프를 한국 표준시(KST, Asia/Seoul) 'YYYY-MM-DD HH:mm' 형태로 포맷팅
 */
export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return '-';
  try {
    let str = isoString.trim();
    if (!str) return '-';

    // 만약 ISO 문자열이 T나 Z 없이 '2026-08-12 03:12' 형태로 전달된 경우 UTC Z 보정
    if (str.includes(' ') && !str.includes('Z') && !str.includes('+')) {
      str = str.replace(' ', 'T') + 'Z';
    } else if (str.includes('T') && !str.includes('Z') && !str.includes('+')) {
      str = str + 'Z';
    }

    const d = new Date(str);
    if (isNaN(d.getTime())) return isoString;

    // 한국 표준시(Asia/Seoul, UTC+9) 24시간제 포맷터
    const formatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(d);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

    const year = getPart('year');
    const month = getPart('month');
    const day = getPart('day');
    let hour = getPart('hour');
    if (hour === '24') hour = '00';
    const minute = getPart('minute');

    return `${year}-${month}-${day} ${hour}:${minute}`;
  } catch {
    return isoString;
  }
}

/**
 * 다양한 날짜 형식(ISO, YYYY-MM-DD, YY/M/D, YYYY.MM.DD)을 안전하게 Date 객체로 파싱
 */
export function parseAnyDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const str = dateStr.trim();
  if (!str) return null;

  try {
    // . 및 / 구문 기호를 - 로 일원화
    let normalized = str.replace(/\./g, '-').replace(/\//g, '-');
    
    // YY-M-D 또는 YY-MM-DD 형식 (예: 26-3-26 -> 2026-03-26) 처리
    const parts = normalized.split('-');
    if (parts.length === 3) {
      let [year, month, day] = parts;
      if (year.length === 2) {
        year = `20${year}`;
      }
      month = month.padStart(2, '0');
      day = day.substring(0, 2).padStart(2, '0');
      normalized = `${year}-${month}-${day}`;
    }

    const timestamp = new Date(normalized).getTime();
    if (isNaN(timestamp)) return null;
    return new Date(timestamp);
  } catch {
    return null;
  }
}

/**
 * 특정 날짜가 현재 시점 기준으로 N일(기본 90일) 경과했는지 판별
 */
export function isOlderThanDays(dateString: string | null | undefined, days: number = 90): boolean {
  const d = parseAnyDate(dateString);
  if (!d) return false;
  const now = Date.now();
  const diffDays = (now - d.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= days;
}

/**
 * 해당 상담건이 완료된 상태인지 판별
 * - status가 '완료'이거나 sub_status가 '결제완료'/'처리완료'인 경우
 */
export function isConsultationCompleted(c: Consultation): boolean {
  if (!c) return false;
  const resolved = getResolvedStatus(c);
  return resolved === '완료';
}

/**
 * 완료된 지 90일 이상 지난 과거 보관 대상 상담건인지 종합 판별
 * 
 * [판별 기준]
 * 1. 반드시 상담이 완료 상태(완료 / 결제완료 / 처리완료)이어야 함. (접수/해결중 건은 항상 표출)
 * 2. 희망 주차 시작일 또는 상담 일자가 미래 일자인 경우 예약건이므로 보관 숨김 안 함.
 * 3. 상담 일자, 희망 주차 시작일, 또는 시스템 완료/접수일(updated_at/created_at) 중 하나라도 90일 경과 시 보관 처리.
 */
export function isOlderArchivedConsultation(c: Consultation, days: number = 90): boolean {
  if (!isConsultationCompleted(c)) {
    return false; // 미완료/진행중건은 기간 무관 항상 활성 목록 표출
  }

  const now = Date.now();

  const hopeParsed = parseAnyDate(c.hope_date);
  const parkingStartParsed = parseAnyDate(c.parking_start_date);
  const updatedParsed = parseAnyDate(c.updated_at || c.created_at);

  // 희망 주차 시작일 또는 상담 일자가 미래 일자(오늘 이후)인 경우 완료 건이어도 보관 숨김 안 함
  if ((parkingStartParsed && parkingStartParsed.getTime() > now) || (hopeParsed && hopeParsed.getTime() > now)) {
    return false;
  }

  // 상담 일자, 희망 주차 시작일, 또는 접수/수정일 중 하나라도 90일 이상 지난 경우 보관 처리
  const isHopeOlder = hopeParsed ? ((now - hopeParsed.getTime()) / (1000 * 60 * 60 * 24)) >= days : false;
  const isParkingStartOlder = parkingStartParsed ? ((now - parkingStartParsed.getTime()) / (1000 * 60 * 60 * 24)) >= days : false;
  const isUpdatedOlder = updatedParsed ? ((now - updatedParsed.getTime()) / (1000 * 60 * 60 * 24)) >= days : false;

  return isHopeOlder || isParkingStartOlder || isUpdatedOlder;
}
