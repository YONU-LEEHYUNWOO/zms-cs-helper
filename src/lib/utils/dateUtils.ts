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
 * DB 저장용 로컬 알림 시각 포맷터 (예: "2026-08-28 17:30")
 * Supabase DB 테이블에 입력받은 시간 그대로(예: 17시 30분) 왜곡 없이 저장
 */
export function formatToDbReminderDateTime(dateStr?: string): string | null {
  if (!dateStr || !dateStr.trim()) return null;
  const str = dateStr.trim();

  // 이미 YYYY-MM-DD HH:mm 또는 YYYY-MM-DD HH:mm:ss 형태면 그대로 반환
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(str)) {
    return str;
  }
  // YYYY-MM-DDTHH:mm 형태면 'T' -> ' ' 변환
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(str)) {
    return str.replace('T', ' ');
  }

  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  } catch {
    return str;
  }
}

/**
 * HTML5 <input type="time"> 바인딩 전용 포맷터 (예: "14:30")
 */
export function formatToInputTime(dateStr?: string): string {
  if (!dateStr) return '09:00';
  const str = dateStr.trim();
  if (/^\d{2}:\d{2}$/.test(str)) return str;

  try {
    const formatted = str.includes(' ') ? str.replace(' ', 'T') : str;
    const d = new Date(formatted);
    if (isNaN(d.getTime())) {
      const match = str.match(/\b\d{2}:\d{2}\b/);
      return match ? match[0] : '09:00';
    }
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${min}`;
  } catch {
    return '09:00';
  }
}

/**
 * Option 1: 목표/마감 일시(datetime-local) 및 미리 알림 옵션(정각, 10분전, 30분전, 1시간전, 알림안함) 계산
 */
export function calculateReminderTime(targetDateTimeStr: string, offset: string): string | null {
  if (!targetDateTimeStr || offset === 'none') return null;
  const formatted = targetDateTimeStr.includes(' ') ? targetDateTimeStr.replace(' ', 'T') : targetDateTimeStr;
  const d = new Date(formatted);
  if (isNaN(d.getTime())) return null;

  let minusMinutes = 0;
  if (offset === '10m') minusMinutes = 10;
  else if (offset === '30m') minusMinutes = 30;
  else if (offset === '1h') minusMinutes = 60;

  const remDate = new Date(d.getTime() - minusMinutes * 60 * 1000);
  const yyyy = remDate.getFullYear();
  const mm = String(remDate.getMonth() + 1).padStart(2, '0');
  const dd = String(remDate.getDate()).padStart(2, '0');
  const hh = String(remDate.getHours()).padStart(2, '0');
  const min = String(remDate.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/**
 * Option 1: 저장된 due_date와 reminder_datetime 비교하여 미리 알림 옵션 역추산
 */
export function detectReminderOffset(due_date?: string, reminder_datetime?: string): 'exact' | '10m' | '30m' | '1h' | 'none' {
  if (!reminder_datetime) return 'none';
  if (!due_date) return 'exact';

  const d1 = new Date(due_date.includes(' ') ? due_date.replace(' ', 'T') : due_date).getTime();
  const d2 = new Date(reminder_datetime.includes(' ') ? reminder_datetime.replace(' ', 'T') : reminder_datetime).getTime();
  if (isNaN(d1) || isNaN(d2)) return 'exact';

  const diffMin = Math.round((d1 - d2) / (1000 * 60));
  if (diffMin === 10) return '10m';
  if (diffMin === 30) return '30m';
  if (diffMin === 60) return '1h';
  if (diffMin === 0) return 'exact';
  return 'exact';
}

/**
 * DB 저장용 ISO 타임스탬프 규격화 함수
 */
export function normalizeToIsoString(dateStr?: string): string | null {
  if (!dateStr || !dateStr.trim()) return null;
  const str = dateStr.trim();
  return str;
}
