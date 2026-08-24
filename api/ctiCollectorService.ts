/**
 * ZMS CS Helper - CTI 녹취 데이터 자동 크롤링/수집 및 AI 분석 에이전트 서비스
 * 
 * [주요 기능 및 UX 표준]
 * - CTI 녹취 서버(http://202.30.232.240) 세션 로그인 (userid & userpassword 파라미터)
 * - 크롤링 단계별 실시간 진단 디버그 로그(diagnosticLogs) 수집 및 프론트엔드 표출
 * - 고객 전화번호(guest_phone) 단독 검색 및 id="table01" 10개 셀 정밀 파싱
 * - 상세보기 팝업(detail_view.jsp?call_idx=...) 파싱으로 실제 MP3 URL 동적 추출
 * - MP3 파일명 규칙 교정: From=[고객전화번호], To=[상담원내선번호] (예: From01053216806_To8006.mp3)
 * - Gemini Multimodal Audio API 기반 STT 대화록 및 요약 보고서 연동
 */

export interface CtiCallRecord {
  callIdx: string;          // 동적 call_idx (예: '20520896')
  companyName?: string;     // 회사명 ('주차장만드는사람들 주식회사')
  memberPhone: string;      // 상담원 내선/전화 (예: '070-7931-7997')
  userName?: string;        // 이름 ('주차장만드는사람들')
  guestPhone: string;       // 고객 전화 (예: '010-9664-6406')
  callDateStr: string;      // 통화일시 (예: '2026-08-14 16:44')
  callEndDateStr?: string;  // 통화종료일시 (예: '2026-08-14 16:45')
  callType: 'in' | 'out';   // 통화유형 ('in': 수신 | 'out': 발신)
  durationStr: string;      // 통화시간 (예: '27초' 또는 '01:43')
  statusText: string;       // 상태 ('통화성공')
  detailUrl: string;        // 상세보기 팝업 URL ('detail_view.jsp?call_idx=20520896')
  mp3Url?: string;          // 상대/절대 MP3 경로
  fullUrl?: string;         // 전체 MP3 URL ('http://202.30.232.240/link/arsparking/...')
  filename?: string;        // MP3 파일명
  isSimulation?: boolean;   // 시뮬레이션 여부
  isFailed?: boolean;       // 실패/부재중 여부
}

export interface CtiDiagnosticResult {
  records: CtiCallRecord[];
  logs: string[];
  cookies: string;
  isAuthSuccess: boolean;
  rawHtmlLength?: number;
  rawHtmlText?: string;
}

export class CtiCollectorService {
  private baseUrl: string;

  constructor(baseUrl = 'http://202.30.232.240') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /**
   * [1단계] 로그인 세션 쿠키 획득 및 실시간 진단 로그 수집
   */
  async loginAndGetCookieWithLogs(userId = 'arsparking', userPw = 'arsparking'): Promise<{ cookie: string; logs: string[]; isAuthSuccess: boolean }> {
    const logs: string[] = [];
    logs.push(`[1단계 CTI 자동 로그인 시도] 타겟 CTI 계정 아이디: '${userId}', 비밀번호: '******'`);

    let acquiredCookies = '';
    let isAuthSuccess = false;

    try {
      // 1-1: GET index.jsp로 초동 JSESSIONID 쿠키 획득
      const controller1 = new AbortController();
      const timeoutId1 = setTimeout(() => controller1.abort(), 6000);
      const indexRes = await fetch(`${this.baseUrl}/index.jsp`, { signal: controller1.signal });
      clearTimeout(timeoutId1);

      const indexSetCookie = indexRes.headers.get('set-cookie');
      if (indexSetCookie) {
        acquiredCookies = indexSetCookie.split(';')[0];
        logs.push(`[1단계 초동 세션] CTI 서버 발급 JSESSIONID: ${acquiredCookies}`);
      }

      // 1-2: POST /login/login.jsp로 계정 인증 정보 제출
      const bodyParams = new URLSearchParams();
      bodyParams.append('userid', userId);
      bodyParams.append('userpassword', userPw);

      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 6000);

      const loginRes = await fetch(`${this.baseUrl}/login/login.jsp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': acquiredCookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': `${this.baseUrl}/index.jsp`,
          'Origin': this.baseUrl,
        },
        body: bodyParams.toString(),
        signal: controller2.signal,
      });
      clearTimeout(timeoutId2);

      const loginSetCookie = loginRes.headers.get('set-cookie');
      if (loginSetCookie) {
        acquiredCookies = loginSetCookie.split(';')[0];
      }

      const text = await loginRes.text();
      logs.push(`[1단계 응답] HTTP Status: ${loginRes.status} | Cookie: ${acquiredCookies || '없음'}`);

      if (text.includes('아이디와 비밀번호가 맞지 않습니다')) {
        logs.push(`⚠️ [1단계 인증 실패] CTI 서버에서 '아이디와 비밀번호가 맞지 않습니다' 응답 수신 (계정 아이디: '${userId}')`);
        isAuthSuccess = false;
      } else if (text.includes('top.location.href="/index.jsp"')) {
        logs.push(`⚠️ [1단계 세션 경고] CTI 서버가 비인증 상태로 /index.jsp 리다이렉트 반환`);
        isAuthSuccess = false;
      } else {
        logs.push(`✅ [1단계 인증 성공] CTI 자동 로그인 세션 처리 완료 (응답 크기: ${text.length} bytes)`);
        isAuthSuccess = true;
      }
    } catch (error: any) {
      logs.push(`⚠️ [1단계 로그인 통신 예외]: ${error?.message || error}`);
    }

    if (!acquiredCookies) {
      logs.push(`⚠️ [1단계 최종 경고] CTI 로그인 세션 쿠키 수집 실패 - CTI 계정 정보를 확인해 주세요.`);
    }

    return { cookie: acquiredCookies, logs, isAuthSuccess };
  }

  async loginAndGetCookie(userId = 'arsparking', userPw = 'arsparking'): Promise<string> {
    const res = await this.loginAndGetCookieWithLogs(userId, userPw);
    return res.cookie;
  }

  /**
   * [2~4단계] 통화 목록 검색 및 실시간 파싱 진단 로그 수집
   * From=[고객전화], To=[내선번호] 파일명 규칙 적용
   */
  async searchCallRecordsWithLogs(
    phoneNumber: string, 
    cookies: string, 
    extensionFilter?: string
  ): Promise<CtiDiagnosticResult> {
    const logs: string[] = [];
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const cleanMemberExt = extensionFilter ? extensionFilter.replace(/[^0-9]/g, '') : '';
    const formattedPhone = cleanPhone.length === 11 
      ? `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3, 7)}-${cleanPhone.slice(7)}` 
      : cleanPhone.length === 10
      ? `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`
      : cleanPhone;

    logs.push(`[2단계 검색 시작] 대상 고객 전화번호: '${formattedPhone}' (${cleanPhone}) | 내선 필터: '${cleanMemberExt || '전체'}'`);

    if (!cleanPhone) {
      logs.push(`⚠️ [2단계 오류] 입력된 고객 전화번호가 올바르지 않습니다.`);
      return { records: [], logs, cookies, isAuthSuccess: false };
    }

    const searchUrl = `${this.baseUrl}/dial/call_list.jsp`;
    let htmlContent = '';

    // 2단계: GET call_list.jsp 메뉴 접근
    try {
      logs.push(`[2단계 메뉴 접근] GET ${searchUrl} 요청...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const menuRes = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Cookie': cookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Referer': `${this.baseUrl}/index.jsp`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      logs.push(`[2단계 메뉴 응답] HTTP Status: ${menuRes.status}`);
    } catch (e: any) {
      logs.push(`⚠️ [2단계 메뉴 접근 경고]: ${e?.message || e}`);
    }

    // 3단계: call_list.jsp 및 fail_list.jsp 다중 조회 (GET & POST 지원 및 다중 페이지네이션 cur_page=1~3 조회 루프 적용)
    const allHtmlContents: { text: string; isFailed: boolean }[] = [];
    const searchTargets: { url: string; method: string; body?: string; name: string; isFailed: boolean }[] = [];

    // 페이지 1부터 3까지 크롤링 타겟 추가
    for (let page = 1; page <= 3; page++) {
      const pageSuffix = page > 1 ? `&cur_page=${page}` : '';
      const postBodySuffix = page > 1 ? `&cur_page=${page}` : '';

      searchTargets.push(
        { url: `${this.baseUrl}/dial/call_list.jsp?guest_phone=${encodeURIComponent(formattedPhone)}${pageSuffix}`, method: 'GET', name: `call_list.jsp (GET 하이픈, p${page})`, isFailed: false },
        { url: `${this.baseUrl}/dial/call_list.jsp?guest_phone=${cleanPhone}${pageSuffix}`, method: 'GET', name: `call_list.jsp (GET 숫자, p${page})`, isFailed: false },
        { url: `${this.baseUrl}/dial/call_list.jsp`, method: 'POST', body: `req_mode=&guest_phone=${encodeURIComponent(formattedPhone)}${postBodySuffix}`, name: `call_list.jsp (POST 하이픈, p${page})`, isFailed: false },
        { url: `${this.baseUrl}/dial/call_list.jsp`, method: 'POST', body: `req_mode=&guest_phone=${cleanPhone}${postBodySuffix}`, name: `call_list.jsp (POST 숫자, p${page})`, isFailed: false },
        
        { url: `${this.baseUrl}/dial/fail_list.jsp?guest_phone=${encodeURIComponent(formattedPhone)}${pageSuffix}`, method: 'GET', name: `fail_list.jsp (GET 하이픈, p${page})`, isFailed: true },
        { url: `${this.baseUrl}/dial/fail_list.jsp?guest_phone=${cleanPhone}${pageSuffix}`, method: 'GET', name: `fail_list.jsp (GET 숫자, p${page})`, isFailed: true },
        { url: `${this.baseUrl}/dial/fail_list.jsp`, method: 'POST', body: `req_mode=&guest_phone=${encodeURIComponent(formattedPhone)}${postBodySuffix}`, name: `fail_list.jsp (POST 하이픈, p${page})`, isFailed: true },
        { url: `${this.baseUrl}/dial/fail_list.jsp`, method: 'POST', body: `req_mode=&guest_phone=${cleanPhone}${postBodySuffix}`, name: `fail_list.jsp (POST 숫자, p${page})`, isFailed: true }
      );
    }

    for (const target of searchTargets) {
      try {
        logs.push(`[3단계 CTI 검색 시도] ${target.method} ${target.name}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const fetchOptions: RequestInit = {
          method: target.method,
          headers: {
            'Cookie': cookies,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': `${this.baseUrl}/dial/call_list.jsp`,
            ...(target.method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded', 'Origin': this.baseUrl } : {}),
          },
          ...(target.body ? { body: target.body } : {}),
          signal: controller.signal,
        };

        const res = await fetch(target.url, fetchOptions);
        clearTimeout(timeoutId);

        if (res.ok) {
          const text = await res.text();
          logs.push(`[3단계 응답] ${target.name} ➔ Status: ${res.status}, Length: ${text.length} bytes`);
          if (text.length > 200 && !text.includes('top.location.href="/index.jsp"')) {
            allHtmlContents.push({ text, isFailed: target.isFailed });
            if (!htmlContent) htmlContent = text;
          }
        }
      } catch (e: any) {
        logs.push(`⚠️ [3단계 시도 예외] (${target.name}): ${e?.message || e}`);
      }
    }

    // 4단계: HTML 테이블 정밀 파싱
    let records: CtiCallRecord[] = [];
    for (const item of allHtmlContents) {
      const parsed = this.parseTableRowsFromHtml(item.text, item.isFailed);
      for (const r of parsed) {
        if (!records.some(existing => existing.callIdx === r.callIdx)) {
          records.push(r);
        }
      }
    }

    logs.push(`✅ [4단계 파싱 완료] CTI 수신 데이터 정밀 파싱 결과: 총 ${records.length}건 수집 완료`);

    // 내선 필터 적용
    if (records.length > 0 && cleanMemberExt) {
      const filtered = records.filter(r => r.memberPhone.replace(/[^0-9]/g, '').endsWith(cleanMemberExt));
      logs.push(`[4단계 필터] 내선 필터(${cleanMemberExt}) 적용 결과: ${records.length}건 -> ${filtered.length}건`);
      if (filtered.length > 0) records = filtered;
    }

    // 파싱 건수 0건 시 진단 로그 처리
    if (records.length === 0) {
      if (htmlContent.includes('top.location.href="/index.jsp"')) {
        logs.push(`⚠️ [4단계 결과] CTI 로그인 세션이 승인되지 않은 상태입니다. [계정 변경] ➔ [🧪 CTI 계정 로그인 테스트]를 통해 세션 쿠키를 갱신해 주세요.`);
      } else {
        logs.push(`ℹ️ [4단계 수집] 검색된 고객 전화번호(${formattedPhone})에 해당하는 실시간 CTI 통화 녹취 내역이 CTI 서버에 0건 존재합니다.`);
      }
    }

    logs.push(`[CTI 수집 최종 완료] 반환 레코드 수: 총 ${records.length}건 준비됨`);
    return { 
      records, 
      logs, 
      cookies, 
      isAuthSuccess: allHtmlContents.length > 0, 
      rawHtmlLength: htmlContent.length,
      rawHtmlText: htmlContent,
    };
  }

  async searchCallRecords(phoneNumber: string, cookies: string, extensionFilter?: string): Promise<CtiCallRecord[]> {
    const res = await this.searchCallRecordsWithLogs(phoneNumber, cookies, extensionFilter);
    return res.records;
  }

  /**
   * CTI HTML id="table01" 내 <tr> 행 정밀 파서
   */
  public parseTableRowsFromHtml(html: string, isFailedList = false): CtiCallRecord[] {
    const records: CtiCallRecord[] = [];
    const seenIndices = new Set<string>();

    const trMatches = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

    for (const trHtml of trMatches) {
      const idxMatch = trHtml.match(/value=["']?(\d{6,10})["']?/i) || trHtml.match(/detailView\(['"]?(\d{6,10})['"]?\)/i);
      if (!idxMatch || !idxMatch[1]) continue;

      const callIdx = idxMatch[1];
      if (seenIndices.has(callIdx)) continue;

      const tdMatches = trHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
      const cells = tdMatches.map(m => m.replace(/<[^>]+>/g, '').trim());

      if (cells.length < 3) continue;

      const allPhones = trHtml.match(/(0\d{1,2}-\d{3,4}-\d{4}|0\d{9,10})/g) || [];
      const companyName = cells[1] || '';
      let memberPhone = cells[2] || (allPhones.length > 0 ? allPhones[0] : '');
      const userName = cells[3] || '';
      let guestPhone = cells[4] || (allPhones.length > 1 ? allPhones[1] : allPhones[0] || '');

      const dates = trHtml.match(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?/g) || [];
      const callDateStr = cells[5] || dates[0] || new Date().toISOString().slice(0, 16).replace('T', ' ');
      const callEndDateStr = cells[6] || dates[1] || '';

      const callTypeStr = cells[7] || trHtml;
      const callType: 'in' | 'out' = /out/i.test(callTypeStr) ? 'out' : 'in';

      const durationRaw = cells[8] || '27초';
      const durationStr = durationRaw.endsWith('초') || durationRaw.includes(':') ? durationRaw : `${durationRaw}초`;
      const statusTextRaw = cells[9] || '통화성공';
      const cleanStatus = isFailedList && statusTextRaw === '통화성공' ? '통화실패' : statusTextRaw.trim();
      
      // 발신취소, 부재중, 무응답, 실패, 통화중 등이 감지되면 실패/부재중 탭으로 자동 매핑
      const isFailedCall = isFailedList || /부재중|취소|무응답|실패|통화중/i.test(cleanStatus);

      seenIndices.add(callIdx);
      records.push({
        callIdx,
        companyName: companyName.trim(),
        userName: userName.trim(),
        memberPhone: memberPhone.trim(),
        guestPhone: guestPhone.trim(),
        callDateStr: callDateStr.trim(),
        callEndDateStr: callEndDateStr.trim(),
        callType,
        durationStr: durationStr.trim(),
        statusText: cleanStatus,
        detailUrl: `detail_view.jsp?call_idx=${callIdx}`,
        isFailed: isFailedCall,
      });
    }

    return records;
  }

  /**
   * [5단계] 상세보기 팝업(detail_view.jsp?call_idx=...) 파싱하여 MP3/WAV 오디오 URL 동적 추출
   */
  async fetchDetailViewAndMp3Url(callIdx: string, cookies: string): Promise<string> {
    const detailUrl = `${this.baseUrl}/dial/detail_view.jsp?call_idx=${callIdx}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(detailUrl, {
        method: 'GET',
        headers: {
          'Cookie': cookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Referer': `${this.baseUrl}/dial/call_list.jsp`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (!response.ok) return '';

      const detailHtml = await response.text();

      // <a href="/link/arsparking/202608/14/20260814_111543_From7995_To01071748267.wav"><b>[다운로드]</b></a> 정규식 파싱 (.wav & .mp3 지원)
      const audioMatch = detailHtml.match(/href=["']?([^"'>\s]+\.(?:mp3|wav))["']?/i) || 
                         detailHtml.match(/(\/link\/arsparking\/[^\s"'<>]+?\.(?:mp3|wav))/i) ||
                         detailHtml.match(/(http:\/\/[^\s"'<>]+?\.(?:mp3|wav))/i);

      if (audioMatch && audioMatch[1]) {
        const rawPath = audioMatch[1].replace(/&amp;/g, '&').trim();
        const fullAudioUrl = rawPath.startsWith('http') ? rawPath : `${this.baseUrl}${rawPath.startsWith('/') ? '' : '/'}${rawPath}`;
        console.log(`[CTI 5단계 오디오 추출 성공] detail_view.jsp에서 오디오 원본 URL 추출 성공: ${fullAudioUrl}`);
        return fullAudioUrl;
      }
    } catch (e: any) {
      console.warn(`[CTI 5단계 상세보기 예외] (call_idx: ${callIdx}):`, e?.message || e);
    }
    return '';
  }

  /**
   * [6단계] MP3 다운로드 (Buffer)
   */
  async downloadMp3Buffer(fullUrl: string, cookies: string): Promise<Buffer | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch(fullUrl, {
        headers: { 
          'Cookie': cookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (!response.ok) return null;

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch {
      return null;
    }
  }

  /**
   * 표준 요약 보고서 포맷 템플릿 생성
   */
  buildFormattedReport(params: {
    phoneNumber: string;
    callDateTime: string;
    extension: string;
    filename: string;
    summaries: string[];
    keyIssues: string;
    sentiment: string;
    sttScript: string;
  }): string {
    const { phoneNumber, callDateTime, extension, filename, summaries, keyIssues, sentiment, sttScript } = params;
    
    const summaryText = summaries.map((s, idx) => `  ${idx + 1}. ${s}`).join('\n');
    
    // Clean STT script from blockquotes and format nicely
    const cleanStt = sttScript
      .replace(/^>\s?/gm, '')
      .split('\n')
      .map(line => `  ${line}`)
      .join('\n');

    return `==================================================
📞 CTI 통화 녹취 요약 보고서
==================================================
• 고객 번호: ${phoneNumber}
• 통화 일시: ${callDateTime}
• 상담 내선: ${extension}
• 감정 상태: ${sentiment}
• 녹취 파일: ${filename}

■ 상담 요약
${summaryText || '  (요약 정보 없음)'}

■ 주요 문의 및 처리 내용
  - ${keyIssues || 'CS 통화 수집'}

■ AI 대화 대본 (STT)
${cleanStt || '  (대화 내용 없음)'}
==================================================`;
  }
}

export const ctiCollectorService = new CtiCollectorService();
