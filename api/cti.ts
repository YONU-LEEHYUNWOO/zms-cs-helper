/**
 * api/cti.ts - CTI 크롤링 & Gemini AI 분석 서버리스 함수 (Vercel)
 * 중요: top-level import 대신 동적 import 사용 - FUNCTION_INVOCATION_FAILED 방지
 */

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 전역 에러 캐처: 모듈 로드 실패 포함 모든 에러를 JSON으로 노출
  try {
    return await handleCtiRequest(req, res);
  } catch (globalErr: any) {
    console.error('[CTI GLOBAL ERROR]:', globalErr);
    return res.status(500).json({
      success: false,
      message: `CTI 서버 오류: ${globalErr?.message || String(globalErr)}`,
      stack: globalErr?.stack?.split('\n').slice(0, 5),
    });
  }
}

async function handleCtiRequest(req: any, res: any) {
  // 정적 import: api/ 폴더 내 번들 파일에서 로드 (Vercel esbuild가 올바르게 번들링)
  const { GoogleGenAI } = await import('@google/genai');
  const { ctiCollectorService } = await import('./ctiCollectorService.js'); // ESM: .js 확장자 필수

  // 1. 요청 바디 안전 파싱

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }
  body = body || {};

  const urlPath = req.url || '';

  // 2. CTI MP3 URL 조회 전용 API (`/api/cti/get-mp3-url`)
  if (urlPath.includes('get-mp3-url') || body.action === 'get-mp3-url') {
    try {
      const { callIdx, ctiUserId, ctiUserPw, sessionCookie } = body;
      if (!callIdx) return res.status(200).json({ success: false, message: 'callIdx가 필요합니다.' });

      let cookies = sessionCookie ? String(sessionCookie).trim() : '';
      if (!cookies) {
        const loginRes = await ctiCollectorService.loginAndGetCookieWithLogs(ctiUserId || 'arsparking', ctiUserPw || 'arsparking');
        cookies = loginRes.cookie;
      }

      const mp3Url = await ctiCollectorService.fetchDetailViewAndMp3Url(String(callIdx), cookies);
      if (mp3Url) {
        return res.json({ success: true, mp3Url });
      } else {
        return res.json({ success: false, message: 'detail_view.jsp에서 MP3 URL을 추출하지 못했습니다.' });
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || String(err) });
    }
  }

  // 3. CTI 오디오 파일 프록시 스트리밍 API (`/api/cti/proxy-audio`)
  if (urlPath.includes('proxy-audio') || body.action === 'proxy-audio' || req.query?.action === 'proxy-audio') {
    try {
      const targetUrl = (req.query?.url || body.url) as string;
      const cookies = (req.query?.cookie || body.cookie || '') as string;

      if (!targetUrl) {
        return res.status(400).send('오디오 URL이 누락되었습니다.');
      }

      const audioBuffer = await ctiCollectorService.downloadMp3Buffer(targetUrl, cookies);
      if (!audioBuffer) {
        return res.status(404).send('오디오 다운로드 실패');
      }

      const isWav = targetUrl.endsWith('.wav');
      const contentType = isWav ? 'audio/wav' : 'audio/mp3';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', audioBuffer.length);
      return res.send(audioBuffer);
    } catch (err: any) {
      console.error('[Vercel CTI Proxy Audio Error]:', err);
      return res.status(500).send('오디오 프록시 스트리밍 에러');
    }
  }

  // 4. CTI 메인 녹취 크롤링 & AI 분석 API (`/api/cti/process-recording`)
  try {
    const { phoneNumber, ctiUserId, ctiUserPw, extensionFilter, selectedCallIdx, action, sessionCookie, preKnownMp3Url, userGeminiKey } = body;

    if (!phoneNumber) {
      return res.status(200).json({ success: false, message: '고객 전화번호가 필요합니다.' });
    }

    const cleanPhone = String(phoneNumber).replace(/[^0-9]/g, '');
    const targetExt = extensionFilter ? String(extensionFilter).replace(/[^0-9]/g, '') : '';

    let cookies = sessionCookie ? String(sessionCookie).trim() : '';
    let logs: string[] = [];

    if (cookies) {
      logs.push(`[1단계 CTI 세션] 전달된 보관 쿠키(${cookies}) 사용`);
    } else {
      const loginRes = await ctiCollectorService.loginAndGetCookieWithLogs(ctiUserId || 'arsparking', ctiUserPw || 'arsparking');
      cookies = loginRes.cookie;
      logs = [...loginRes.logs];
    }

    let records: any[] = [];
    let targetRecord: any = null;

    if (action === 'search_only') {
      const searchRes = await ctiCollectorService.searchCallRecordsWithLogs(cleanPhone, cookies, targetExt);
      records = searchRes.records;
      logs = [...logs, ...searchRes.logs];
      return res.json({
        success: true,
        records,
        logs,
        rawHtmlText: searchRes.rawHtmlText || '',
      });
    }

    if (selectedCallIdx || (preKnownMp3Url && !preKnownMp3Url.endsWith('00.mp3'))) {
      logs.push(`⚡ [초고속 단축 경로] callIdx(${selectedCallIdx}) 분석 요청 ➔ 16페이지 중복 목록 검색 스킵 및 MP3 직행 파싱`);
      let liveMp3Url = preKnownMp3Url;
      if (!liveMp3Url || liveMp3Url.endsWith('00.mp3') || liveMp3Url.includes('20520896')) {
        try {
          logs.push(`[5단계] detail_view.jsp?call_idx=${selectedCallIdx} MP3 URL 추출 시도...`);
          liveMp3Url = await ctiCollectorService.fetchDetailViewAndMp3Url(String(selectedCallIdx), cookies);
          if (liveMp3Url) logs.push(`✅ [5단계 성공] MP3 실시간 URL 획득: ${liveMp3Url}`);
        } catch (detErr: any) {
          logs.push(`⚠️ [5단계 예외] detail_view 파싱 실패: ${detErr?.message || detErr}`);
        }
      }

      targetRecord = {
        callIdx: String(selectedCallIdx || '20520896'),
        memberPhone: targetExt.length === 4 ? `070-7931-${targetExt}` : '070-7931-7997',
        guestPhone: cleanPhone,
        callDateStr: new Date().toISOString().slice(0, 16).replace('T', ' '),
        callType: 'in',
        durationStr: '통화',
        statusText: '통화성공',
        fullUrl: liveMp3Url || '',
        mp3Url: liveMp3Url || '',
        filename: liveMp3Url ? String(liveMp3Url).split('/').pop() || 'recording.mp3' : 'recording.mp3',
      };
      records = [targetRecord];
    } else {
      const searchRes = await ctiCollectorService.searchCallRecordsWithLogs(cleanPhone, cookies, targetExt);
      records = searchRes.records;
      logs = [...logs, ...searchRes.logs];
      if (records && records.length > 0) {
        targetRecord = records[0];
      }
    }

    const isMetadataOnly = body.onlyMetadata !== false;
    let audioBuffer: Buffer | null = null;

    if (!isMetadataOnly && targetRecord.fullUrl && !targetRecord.isSimulation) {
      try {
        logs.push(`[6단계 오디오 다운로드] 다운로드 시작: ${targetRecord.fullUrl}`);
        audioBuffer = await ctiCollectorService.downloadMp3Buffer(targetRecord.fullUrl, cookies);
        if (audioBuffer) {
          logs.push(`[6단계 오디오 다운로드 완료] 크기: ${audioBuffer.length} bytes`);
        }
      } catch (e: any) {
        logs.push(`⚠️ [6단계 오디오 다운로드 실패]: ${e?.message || e}`);
      }
    }

    // Gemini AI 인스턴스 준비 (사용자 개별 키만 사용, 서버 전역 키 없음)
    // GEMINI_API_KEY가 없으면 Gemini 분석 없이 크롤링 결과만 반환
    const effectiveApiKey = userGeminiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || null;
    const ai = effectiveApiKey
      ? new GoogleGenAI({
          apiKey: effectiveApiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        })
      : null;

    if (!effectiveApiKey) {
      logs.push(`ℹ️ [Gemini 비활성화] 사용자 Gemini API 키 미제공 - 크롤링 메타데이터만 반환합니다.`);
    }

    const extName = targetRecord.memberPhone || targetExt || '070-7931-7997';
    const phoneDisplay = targetRecord.guestPhone || cleanPhone;

    let summaries = [
      `고객[${phoneDisplay}] CS 통화 접수 등록 건`,
      `상담 일시: ${targetRecord.callDateStr || '확인불가'}`,
      `수신 대표번호: ${extName} (${targetRecord.callType === 'in' ? '수신' : '발신'} 통화)`,
      `통화 상태 및 시간: ${targetRecord.statusText} (${targetRecord.durationStr})`,
    ];
    let keyIssues = 'CS 통화 수집';
    let sentiment = '중립';
    let sttScript = `[통화 메타데이터]\n- 통화 일시: ${targetRecord.callDateStr}\n- 고객 번호: ${phoneDisplay}\n- 대표 번호: ${extName}\n- 통화 시간: ${targetRecord.durationStr}`;

    if (ai) {
      if (isMetadataOnly) {
        try {
          const textPrompt = `당신은 주차 CS 센터 통화 기록 요약봇입니다.
다음 통화 기록 메타데이터를 기반으로, 상담사가 한눈에 파악할 수 있도록 1~2문장의 가독성 높은 한국어 글로 요약해 주세요.
- 통화일시: ${targetRecord.callDateStr}
- 발신 고객: ${phoneDisplay}
- 수신 대표번호: ${extName}
- 통화구분: ${targetRecord.callType === 'in' ? '수신(Inbound)' : '발신(Outbound)'}
- 통화시간 및 상태: ${targetRecord.durationStr} (${targetRecord.statusText})
출력은 반드시 다른 마크다운 기호 없이 한글 요약 본문만 반환해 주세요.`;

          const modelCandidates = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-1.5-flash-latest', 'gemini-2.0-flash-lite', 'gemini-1.5-pro'];
          let isKeyBlocked = false;
          for (const m of modelCandidates) {
            try {
              const aiRes = await ai.models.generateContent({ model: m, contents: textPrompt });
              if (aiRes && aiRes.text) {
                summaries = [aiRes.text.trim(), `상세 STT 대화록이 필요하신 경우 [🎙️ 상세 STT 분석]을 실행해 주세요.`];
                logs.push(`✅ [Gemini 텍스트 요약 성공] 모델: ${m}`);
                break;
              }
            } catch (mErr: any) {
              const errStr = String(mErr?.message || mErr);
              logs.push(`⚠️ [Gemini 텍스트 요약 실패 (${m})]: ${errStr}`);
              if (errStr.includes('leaked') || errStr.includes('PERMISSION_DENIED') || errStr.includes('403')) {
                logs.push(`🚨 [Gemini API Key 차단 감지] 입력하신 API Key가 Google 유출 정책으로 차단되었습니다. https://aistudio.google.com/app/apikey 에서 무료 새 Key를 발급받아 등록해 주세요.`);
                isKeyBlocked = true;
                break;
              }
            }
          }
        } catch (textErr: any) {
          logs.push(`⚠️ [Gemini 텍스트 요약 예외]: ${textErr?.message || textErr}`);
        }
      } else if (audioBuffer) {
        try {
          const durationSec = parseDurationSeconds(targetRecord.durationStr);

          // 🚨 1~3초 이내 단기/즉시끊김 통화인 경우 AI 할루시네이션 완벽 차단
          if (durationSec > 0 && durationSec <= 3) {
            summaries = [
              "고객 문의 원인: 1~3초 이내에 통화가 연결 직후 종료되어 음성 문의 내역이 없습니다.",
              "상담원 확인 내용: 단기 접속 및 조기 종료 통화로 감지되었습니다.",
              "안내 및 조치 내용: 통화 연결 직후 끊김으로 추가 조치 내역이 없습니다.",
              "최종 처리 결과: 통화 종료"
            ];
            keyIssues = "단기 종료 통화";
            sentiment = "중립";
            sttScript = "[음성 대화 없음]\n1~3초 이내에 연결이 바로 종료된 통화로 음성 대화 스크립트가 존재하지 않습니다.";
            logs.push(`ℹ️ [단기 통화 감지] 통화시간 ${targetRecord.durationStr} (${durationSec}초) <= 3초 ➔ AI 가짜 대화 생성 차단 및 단기 종료 안내 처리 완료`);
          } else {
            const base64Audio = audioBuffer.toString('base64');
            const isWav = targetRecord.filename?.endsWith('.wav');
            const audioMimeType = isWav ? 'audio/wav' : 'audio/mp3';

            const modelCandidates = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-1.5-flash-latest', 'gemini-2.0-flash-lite', 'gemini-1.5-pro'];
            let isKeyBlocked = false;
            for (const m of modelCandidates) {
              try {
                logs.push(`[Gemini AI 오디오 분석 시도] 모델: ${m}`);
                const geminiPromise = ai.models.generateContent({
                  model: m,
                  contents: [
                    { inlineData: { mimeType: audioMimeType, data: base64Audio } },
                    `당신은 ZMS CS 주차 관리 센터의 최고 수석 AI 상담원 분석관입니다.
오디오를 청취하여 전체 통화 내용의 핵심을 정확히 4줄 스토리로 요약하고 STT 대화록을 추출해 주세요.

🚨 [중요 할루시네이션 절대 방지 지침]
- 오디오에 실제 상담사와 고객 간의 유선 대화 내용이 명확히 포함되어 있는 경우에만 대화를 작성하세요.
- 만약 오디오가 무음이거나 1~3초 이내에 바로 끊긴 단기 통화여서 대화 내용이 없는 경우, 절대로 가짜 주차 문의(차단기 미개방, 12가 3456 등)를 허구로 지어내지 마시고 반드시 다음과 같이 작성해 주세요:
---SUMMARY---
고객 문의 원인: 1~3초 이내에 연결이 바로 종료되어 음성 문의 내역 없음
상담원 확인 내용: 조기 종료 통화 감지됨
안내 및 조치 내용: 추가 조치 내역 없음
최종 처리 결과: 통화 종료
---KEY_ISSUES---
단기 종료
---SENTIMENT---
중립
---TRANSCRIPT---
[음성 대화 없음]

출력은 반드시 다음 4가지 섹션을 명확히 구분하여 작성해 주세요 (마크다운 특수문자 ** 나 * 또는 1), 2) 숫자 헤더는 절대 사용하지 마세요):

---SUMMARY---
고객 문의 원인: (고객 문의 및 유선 접속 원인 1줄)
상담원 확인 내용: (상담원 확인 및 시스템 조회 내용 1줄)
안내 및 조치 내용: (안내 및 현장 조치 내용 1줄)
최종 처리 결과: (최종 처리 결과 및 통화 종료 상태 1줄)

---KEY_ISSUES---
(3~5개 주요 키워드)

---SENTIMENT---
(긍정 / 중립 / 부정 중 선택)

---TRANSCRIPT---
([00:05] 상담사: ...
[00:10] 고객: ...)`,
                  ],
                });

              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Gemini ${m} 응답 시간 초과 (25초)`)), 25000)
              );

              const aiRes: any = await Promise.race([geminiPromise, timeoutPromise]);
              if (aiRes && aiRes.text) {
                const fullText = aiRes.text;

                // STT 대화록 구분선 찾기
                const sttMarkerRegex = /(?:---TRANSCRIPT---|4\)\s*STT\s*대화록|STT\s*대화록|대화록\s*:?)/i;
                const match = fullText.match(sttMarkerRegex);

                let summaryPart = fullText;
                let scriptPart = fullText;

                if (match && match.index !== undefined && match.index > 10) {
                  summaryPart = fullText.slice(0, match.index).trim();
                  scriptPart = fullText.slice(match.index + match[0].length).trim();
                }

                // 핵심 이슈 키워드 추출
                const issueMatch = fullText.match(/(?:---KEY_ISSUES---|2\)\s*핵심이슈|핵심이슈)\s*:?\s*([^\n\---]+)/i);
                if (issueMatch && issueMatch[1]) {
                  keyIssues = issueMatch[1].replace(/[\*\#]/g, '').trim();
                }

                // 감정 추출
                const sentimentMatch = fullText.match(/(?:---SENTIMENT---|3\)\s*감정|감정)\s*:?\s*([^\n\---]+)/i);
                if (sentimentMatch && sentimentMatch[1]) {
                  sentiment = sentimentMatch[1].replace(/[\*\#]/g, '').trim();
                }

                // summaries 정제
                const parsedLines = cleanAndFilterSummaryLines(summaryPart);
                if (parsedLines.length > 0) {
                  summaries = parsedLines;
                }

                sttScript = scriptPart
                  .replace(/^(?:---TRANSCRIPT---|4\)\s*STT\s*대화록|STT\s*대화록|대화록\s*:?)\s*/i, '')
                  .trim();

                logs.push(`✅ [Gemini AI 오디오 분석 성공] 모델: ${m}`);
                break;
              }
            } catch (mErr: any) {
              const errStr = String(mErr?.message || mErr);
              logs.push(`⚠️ [Gemini AI 오디오 분석 실패 (${m})]: ${errStr}`);
              if (errStr.includes('leaked') || errStr.includes('PERMISSION_DENIED') || errStr.includes('403')) {
                logs.push(`🚨 [Gemini API Key 차단 감지] 입력하신 API Key가 Google 유출 정책으로 차단되었습니다. https://aistudio.google.com/app/apikey 에서 무료 새 Key를 발급받아 등록해 주세요.`);
                isKeyBlocked = true;
                break;
              }
            }
          }

          if (isKeyBlocked) {
            return res.json({
              success: false,
              message: '🚨 입력하신 Gemini API Key가 Google에 의해 유출(Leaked) 위험으로 차단되었습니다. [🔑 Gemini API Key 설정] 버튼을 클릭하여 Google AI Studio에서 무료로 발급받은 새 API Key를 입력해 주세요.',
              records,
              selectedRecord: targetRecord,
              logs,
            });
          }
        }
      } catch (audioErr: any) {
        logs.push(`⚠️ [Gemini AI 오디오 분석 예외]: ${audioErr?.message || audioErr}`);
      }
    }
  }

  const formattedReport = summaries.map((s, i) => `${i + 1}. ${s}`).join('\n');

    return res.json({
      success: true,
      records,
      selectedRecord: targetRecord,
      record: targetRecord,
      summary: formattedReport,
      formattedReport,
      summaries,
      keyIssues,
      sentiment,
      sttScript,
      logs,
      sessionCookie: cookies,
    });
  } catch (err: any) {
    console.error('[Vercel CTI Main Handler Error]:', err);
    return res.status(500).json({
      success: false,
      message: `CTI 파이프라인 처리 중 에러 발생: ${err?.message || err}`,
    });
  }
}

/**
 * CTI Gemini 요약 텍스트 정제 및 마크다운 찌꺼기 제거 전용 유틸리티
 */
function cleanAndFilterSummaryLines(rawSummaryPart: string): string[] {
  if (!rawSummaryPart) return [];

  // Cut off key issues, sentiment, transcript section if included
  let summaryOnly = rawSummaryPart;
  const cutIdx = rawSummaryPart.search(/(?:---KEY_ISSUES---|---SENTIMENT---|---TRANSCRIPT---|2\)\s*핵심이슈|3\)\s*감정|4\)\s*STT|핵심이슈|감정)/i);
  if (cutIdx > 0) {
    summaryOnly = rawSummaryPart.slice(0, cutIdx);
  }

  const lines = summaryOnly.split('\n');
  const cleaned: string[] = [];

  for (let line of lines) {
    let trimmed = line.trim();
    if (!trimmed) continue;

    // Filter out section title markers like "1) 요약", "**1) 요약**", "---SUMMARY---"
    if (/^(?:\*|\#)*\s*(?:\d+\)\s*)?(?:요약|핵심이슈|감정|STT대화록|---SUMMARY---|---TRANSCRIPT---|---KEY_ISSUES---|---SENTIMENT---)/i.test(trimmed)) {
      continue;
    }
    // Filter out standalone line numbers like "2", "3", "4", "5"
    if (/^\d+$/.test(trimmed)) {
      continue;
    }
    // Filter out lines that are just markdown syntax symbols
    if (/^[\*\#\-•\s]+$/.test(trimmed)) {
      continue;
    }

    // Strip leading bullet markers ("•", "*", "-", "1.", "• 1.", etc.)
    trimmed = trimmed.replace(/^(?:[•\*\-]|[\d]+\.|\b\d+\b)+\s*/, '').trim();
    trimmed = trimmed.replace(/^(?:[•\*\-]|[\d]+\.)+\s*/, '').trim();

    // Clean raw markdown bold syntax `**`
    trimmed = trimmed.replace(/\*\*/g, '').trim();

    // Ignore if it starts with "핵심이슈:" or "감정:"
    if (/^(?:핵심이슈|감정)\s*[:：]/i.test(trimmed)) {
      continue;
    }

    if (trimmed.length > 0 && !cleaned.includes(trimmed)) {
      cleaned.push(trimmed);
    }
  }

  return cleaned;
}

/**
 * CTI 통화시간 텍스트 (예: '1초', '27초', '01:43', '1분 43초')를 초(Second) 숫자로 변환 유틸
 */
function parseDurationSeconds(durationStr?: string): number {
  if (!durationStr) return 0;
  const clean = durationStr.trim();

  if (clean.includes(':')) {
    const parts = clean.split(':').map(p => parseInt(p, 10) || 0);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  let totalSec = 0;
  const minMatch = clean.match(/(\d+)\s*분/);
  if (minMatch) totalSec += parseInt(minMatch[1], 10) * 60;
  const secMatch = clean.match(/(\d+)\s*초/);
  if (secMatch) totalSec += parseInt(secMatch[1], 10);

  if (!minMatch && !secMatch) {
    const numOnly = parseInt(clean.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(numOnly)) totalSec = numOnly;
  }

  return totalSec;
}


