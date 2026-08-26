/**
 * ZMS CS Helper - KST / Local Timezone Date & Time Normalization Utilities
 * 
 * [핵심 기능]
 * 1. UTC ISO 타임스탬프와 로컬 KST 날짜/시각 간 변환 및 시(Hour) 시프트 버그 완전 방지
 * 2. HTML5 <input type="date"> 및 <input type="datetime-local"> 바인딩 포맷팅 지원
 * 3. 카드 및 알림 UI 표출 시 KST(한국 표준시) 기준 YYYY-MM-DD HH:mm 표시
 */

/**
 * UI 표출용 날짜 + 시:분 포맷터 (예: "2026-08-28 17:30")
 * ISO UTC 타임스탬프("2026-08-28T08:30:00.000Z")를 한국 로컬 시각 "2026-08-28 17:30"으로 파싱
 */
export function formatDisplayDateTime(dateStr?: string): string {
  if (!dateStr) return '';

  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return dateStr.replace('T', ' ').slice(0, 16);
    }
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  } catch {
    return dateStr.replace('T', ' ').slice(0, 16);
  }
}

/**
 * UI 표출용 YYYY-MM-DD 날짜 포맷터 (예: "2026-08-28")
 */
export function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '';

  try {
    // 순수 YYYY-MM-DD 형태면 바로 반환
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
      return dateStr.trim();
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return dateStr.slice(0, 10);
    }
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return dateStr.slice(0, 10);
  }
}

/**
 * HTML5 <input type="datetime-local"> 바인딩 전용 포맷터 (예: "2026-08-28T17:30")
 */
export function formatToInputDateTime(dateStr?: string): string {
  if (!dateStr) return '';

  try {
    // 이미 YYYY-MM-DDTHH:mm 형태면 바로 반환
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateStr.trim())) {
      return dateStr.trim();
    }
    // "YYYY-MM-DD HH:mm" 형태 처리
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(dateStr.trim())) {
      return dateStr.trim().replace(' ', 'T');
    }

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  } catch {
    return '';
  }
}

/**
 * HTML5 <input type="date"> 바인딩 전용 포맷터 (예: "2026-08-28")
 */
export function formatToInputDate(dateStr?: string): string {
  if (!dateStr) return '';

  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
      return dateStr.trim();
    }
    if (dateStr.length >= 10 && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.slice(0, 10))) {
      return dateStr.slice(0, 10);
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return dateStr.slice(0, 10);
  }
}

/**
 * DB 저장용 ISO 타임스탬프 규격화 함수
 * 로컬 datetime 문자열("2026-08-28T17:30")을 ISO 8601 UTC 타임스탬프로 정확히 변환
 */
export function normalizeToIsoString(dateStr?: string): string | null {
  if (!dateStr || !dateStr.trim()) return null;
  const str = dateStr.trim();

  // 이미 ISO UTC 형태("...Z")이면 변환 없이 그대로 반환 (이중 시프트 방지)
  if (str.endsWith('Z')) return str;

  try {
    // "2026-08-28 17:30" -> "2026-08-28T17:30"
    const formatted = str.replace(' ', 'T');
    const d = new Date(formatted);
    if (isNaN(d.getTime())) return str;
    return d.toISOString();
  } catch {
    return str;
  }
}
