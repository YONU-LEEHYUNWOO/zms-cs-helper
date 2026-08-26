import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { ctiCollectorService } from './src/backend/services/cti/ctiCollectorService';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper function to get Gemini instance cleanly
  function getGeminiAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // 1. CTI Call List API (static fallback data)
  app.get('/api/cti/calls', (req, res) => {
    res.json([
      {
        id: 'call-101',
        phone_number: '01012344567',
        audio_url: 'http://202.30.232.240/dial/call_list.jsp?id=20260804_001',
        stt_script: `[상담사] ParkOS 주차 공유 고객센터입니다.\n[고객] 네, 강남역 테헤란빌딩 주차장 차단기가 안 열려요.\n[상담사] 네, 확인 후 원격으로 개방해 드리겠습니다.`,
        ai_summary: '강남역 차단기 미인식 원격 개방 지원건.',
        created_at: new Date().toISOString(),
      },
    ]);
  });

  // 1-0. CTI 단건 MP3 URL 조회 전용 경량 엔드포인트 (직접 링크 열기 버튼용)
  app.post('/api/cti/get-mp3-url', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    try {
      const { callIdx, ctiUserId, ctiUserPw, sessionCookie } = req.body;
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
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // 1-1. CTI Automated Recording Collector & AI Analysis Pipeline API
  app.post('/api/cti/process-recording', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    try {
      const { phoneNumber, ctiUserId, ctiUserPw, extensionFilter, selectedCallIdx, action, sessionCookie, preKnownMp3Url } = req.body;
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
        const loginRes = await ctiCollectorService.loginAndGetCookieWithLogs(ctiUserId || 'guest', ctiUserPw || 'guest1');
        cookies = loginRes.cookie;
        logs = [...loginRes.logs];
      }

      const searchRes = await ctiCollectorService.searchCallRecordsWithLogs(cleanPhone, cookies, targetExt);
      let records: any[] = searchRes.records;
      logs = [...logs, ...searchRes.logs];

      if (action === 'search_only') {
        return res.json({
          success: true,
          records,
          logs,
          rawHtmlText: searchRes.rawHtmlText || '',
        });
      }

      let targetRecord: any = null;
      console.log('\n=============================================================');
      console.log(`[CTI Server] 📥 /api/cti/process-recording 요청 수신: 고객번호=${cleanPhone}, callIdx=${selectedCallIdx || '미지정'}, onlyMetadata=${req.body.onlyMetadata}`);
      console.log('=============================================================');

      if (records && records.length > 0) {
        if (selectedCallIdx) {
          targetRecord = records.find(r => r.callIdx === selectedCallIdx) || records[0];
        } else {
          targetRecord = records[0];
        }

        if (targetRecord && targetRecord.callIdx) {
          try {
            console.log(`[CTI Server 5단계] 🔍 detail_view.jsp?call_idx=${targetRecord.callIdx} 에서 실시간 MP3/WAV URL 파싱 시도...`);
            logs.push(`[5단계] detail_view.jsp?call_idx=${targetRecord.callIdx} MP3 URL 추출 시도...`);
            const liveMp3Url = await ctiCollectorService.fetchDetailViewAndMp3Url(targetRecord.callIdx, cookies);
            if (liveMp3Url) {
              targetRecord.fullUrl = liveMp3Url;
              targetRecord.mp3Url = liveMp3Url;
              targetRecord.filename = liveMp3Url.split('/').pop() || 'recording.mp3';
              console.log(`[CTI Server 5단계 성공] ✅ 실시간 MP3 URL 획득 성공: ${liveMp3Url}`);
              logs.push(`✅ [5단계 성공] MP3 실시간 URL 획득: ${liveMp3Url}`);
            } else if (preKnownMp3Url && !preKnownMp3Url.endsWith('00.mp3')) {
              targetRecord.fullUrl = preKnownMp3Url;
              targetRecord.mp3Url = preKnownMp3Url;
              targetRecord.filename = String(preKnownMp3Url).split('/').pop() || 'recording.mp3';
              console.log(`[CTI Server 5단계] ℹ️ 기존 전달된 URL 사용: ${preKnownMp3Url}`);
            } else {
              console.warn(`[CTI Server 5단계 경고] ⚠️ detail_view.jsp에서 오디오 링크를 찾지 못함`);
              logs.push(`ℹ️ [5단계] detail_view.jsp에서 MP3 URL 파싱되지 않음`);
            }
          } catch (detErr: any) {
            console.error(`[CTI Server 5단계 오류] detail_view 파싱 실패:`, detErr);
            logs.push(`⚠️ [5단계 예외] detail_view 파싱 실패: ${detErr?.message || detErr}`);
          }
        }
      } else {
        const now = new Date();
        const ymd = now.toISOString().slice(0, 10);
        const timeStr = now.toTimeString().slice(0, 5);
        const ext = targetExt || '7997';
        const filename = `${ymd.replace(/-/g, '')}_164455_From${cleanPhone}_To${ext}.mp3`;

        targetRecord = {
          callIdx: selectedCallIdx || '20520896',
          memberPhone: ext.length === 4 ? `070-7931-${ext}` : '070-7931-7997',
          guestPhone: cleanPhone.length === 11 ? `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3, 7)}-${cleanPhone.slice(7)}` : cleanPhone,
          callDateStr: `${ymd} ${timeStr}`,
          callType: 'in',
          durationStr: '1분 43초',
          statusText: '통화성공',
          detailUrl: 'detail_view.jsp?call_idx=20520896',
          fullUrl: `http://202.30.232.240/link/arsparking/202608/13/${filename}`,
          relativeUrl: `/link/arsparking/202608/13/${filename}`,
          filename,
          isSimulation: true,
        };
        records = [targetRecord];
      }

      const isMetadataOnly = req.body.onlyMetadata !== false; // 기본값은 true (토큰 절약)

      let audioBuffer: Buffer | null = null;
      if (!isMetadataOnly && targetRecord.fullUrl && !targetRecord.isSimulation) {
        try {
          console.log(`[CTI Server 6단계] 🎧 오디오 파일 다운로드 시작: ${targetRecord.fullUrl}`);
          logs.push(`[6단계 오디오 다운로드] 다운로드 시작: ${targetRecord.fullUrl}`);
          audioBuffer = await ctiCollectorService.downloadMp3Buffer(targetRecord.fullUrl, cookies);
          if (audioBuffer) {
            console.log(`[CTI Server 6단계 완료] ✅ 오디오 다운로드 성공 (크기: ${audioBuffer.length} bytes)`);
            logs.push(`[6단계 오디오 다운로드 완료] 크기: ${audioBuffer.length} bytes`);
          } else {
            console.warn(`[CTI Server 6단계 경고] ⚠️ 오디오 다운로드 결과가 빈 버퍼(null)입니다.`);
          }
        } catch (e: any) {
          console.error(`[CTI Server 6단계 오류] ⚠️ 오디오 다운로드 실패:`, e);
          logs.push(`⚠️ [6단계 오디오 다운로드 실패]: ${e?.message || e}`);
        }
      } else if (isMetadataOnly) {
        console.log(`[CTI Server 6단계] ⚡ onlyMetadata=true로 오디오 다운로드 생략 (메타 요약 모드)`);
        logs.push(`[6단계 건너뜀] onlyMetadata=true로 오디오 다운로드 생략 (토큰/비용 절약)`);
      }

      const ai = getGeminiAI();
      const extName = targetRecord.memberPhone || targetExt || '070-7931-7997';
      const phoneDisplay = targetRecord.guestPhone || cleanPhone;

      let summaries = [
        `고객[${phoneDisplay}] CS 통화 접수 등록 건`,
        `상담 일시: ${targetRecord.callDateStr || '확인불가'}`,
        `수신 대표번호: ${extName} (${targetRecord.callType === 'in' ? '수신' : '발신'} 통화)`,
        `통화 상태 및 시간: ${targetRecord.statusText} (${targetRecord.durationStr})`,
        `상세 대화록은 [상세 STT 스크립트 분석]을 누르면 추출됩니다.`
      ];
      let keyIssues = 'CS 통화 수집';
      let sentiment = '중립';
      let sttScript = `[통화 메타데이터]\n- 통화 일시: ${targetRecord.callDateStr}\n- 고객 번호: ${phoneDisplay}\n- 대표 번호: ${extName}\n- 통화 시간: ${targetRecord.durationStr}\n\n상세 STT 대화록을 추출하려면 모달 내 [상세 STT 스크립트 분석] 버튼을 눌러주세요.`;

      if (ai) {
        if (isMetadataOnly) {
          // 1) 텍스트 전용 모드 (매우 저렴한 토큰 소모) - 통화 메타데이터를 기반으로 1-2줄 요약 생성
          try {
            const textPrompt = `당신은 주차 CS 센터 통화 기록 요약봇입니다.
다음 통화 기록 메타데이터를 기반으로, 상담사가 한눈에 파악할 수 있도록 1~2문장의 가독성 높은 한국어 글로 요약해 주세요.
예: "2026-08-14 11:36에 상담원(7998)이 고객(010-4119-6931)에게 발신하여 42초 동안 정상적으로 통화(통화성공)를 완료했습니다."

- 통화일시: ${targetRecord.callDateStr}
- 발신 고객: ${phoneDisplay}
- 수신 대표번호: ${extName}
- 통화구분: ${targetRecord.callType === 'in' ? '수신(Inbound)' : '발신(Outbound)'}
- 통화시간 및 상태: ${targetRecord.durationStr} (${targetRecord.statusText})

출력은 반드시 다른 마크다운 기호 없이 한글 요약 본문만 반환해 주세요.`;

            logs.push(`[Gemini 텍스트 요약 시작] 텍스트 요약본 생성 시도 (onlyMetadata=true)`);
            const modelCandidates = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
            let aiRes: any = null;
            for (const m of modelCandidates) {
              try {
                aiRes = await ai.models.generateContent({
                  model: m,
                  contents: textPrompt,
                });
                if (aiRes && aiRes.text) {
                  logs.push(`✅ [Gemini 텍스트 요약 성공] 모델: ${m}`);
                  break;
                }
              } catch (mErr: any) {
                logs.push(`⚠️ [Gemini 텍스트 요약 실패 (모델 ${m})]: ${mErr?.message || mErr}`);
              }
            }

            if (aiRes && aiRes.text) {
              const summaryLine = aiRes.text.trim();
              if (summaryLine) {
                summaries = [
                  summaryLine,
                  `상세한 상담 대화 분석(STT)이 필요하신 경우, CTI 분석 창에서 [🎙️ 상세 STT 분석]을 실행해 주세요.`
                ];
                logs.push(`✅ [Gemini 텍스트 요약 완료] 메타 요약 생성 완료`);
              }
            }
          } catch (textErr: any) {
            logs.push(`⚠️ [Gemini 텍스트 요약 예외]: ${textErr?.message || textErr}`);
          }
        } else if (audioBuffer) {
          // 2) 전체 오디오 멀티모달 분석 모드 (Gemini 3.5/3.6/2.0 JSON 스키마 적용)
          try {
            const base64Audio = audioBuffer.toString('base64');
            const isWav = targetRecord.filename?.endsWith('.wav');
            const audioMimeType = isWav ? 'audio/wav' : 'audio/mp3';

            console.log(`[CTI Gemini] 🤖 멀티모달 오디오 AI 분석 시작 (오디오 크기: ${audioBuffer.length} bytes, MIME: ${audioMimeType})`);
            logs.push(`[Gemini AI 멀티모달 오디오 분석 시작] 크기: ${audioBuffer.length} bytes`);

            const modelCandidates = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
            let aiResult: any = null;

            for (const m of modelCandidates) {
              try {
                console.log(`[CTI Gemini] ⏳ 모델 (${m}) 요청 전송 중...`);
                logs.push(`[Gemini AI 오디오 분석 시도] 모델: ${m}`);
                const geminiPromise = ai.models.generateContent({
                  model: m,
                  contents: [
                    {
                      inlineData: {
                        mimeType: audioMimeType,
                        data: base64Audio,
                      },
                    },
                    {
                      text: `당신은 주차 CS 센터 CTI 녹취 오디오 처리 AI 어시스턴트입니다.
제공된 오디오를 듣고 다음 구조의 JSON 객체 형식으로 한국어로 작성해 주세요:
{
  "sttScript": "타임스탬프 [MM:SS] 형식을 앞에 붙인 상담사와 고객의 상세 대화 내용 대본 전체",
  "summaries": ["오디오 대화를 분석하여 도출한 상담 핵심 요약 문장 1", "오디오 대화를 분석하여 도출한 상담 핵심 요약 문장 2", "오디오 대화를 분석하여 도출한 상담 핵심 요약 문장 3"],
  "keyIssues": "상담사 또는 고객의 주요 문의 사항 및 처리 결과 한 문장 요약",
  "sentiment": "고객의 상담 감정 상태 (긍정 / 중립 / 부정 중 택1)"
}`,
                    },
                  ],
                  config: {
                    responseMimeType: 'application/json',
                  }
                });

                const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 35000));
                const res: any = await Promise.race([geminiPromise, timeoutPromise]);
                if (res && res.text) {
                  aiResult = res;
                  console.log(`[CTI Gemini 성공] ✅ 모델 (${m}) 분석 응답 수신 성공!`);
                  logs.push(`✅ [Gemini AI 오디오 분석 성공] 모델: ${m}`);
                  break;
                } else {
                  console.warn(`[CTI Gemini 경고] ⚠️ 모델 (${m}) 35초 타임아웃 또는 응답 없음`);
                }
              } catch (mErr: any) {
                console.error(`[CTI Gemini 실패] ❌ 모델 (${m}) 에러 발생:`, mErr?.message || mErr);
                logs.push(`⚠️ [Gemini AI 오디오 분석 실패 (모델 ${m})]: ${mErr?.message || mErr}`);
              }
            }

            if (aiResult && aiResult.text) {
              const resText = aiResult.text.trim();
              console.log(`[CTI Gemini 결과 본문 미리보기]:\n`, resText.slice(0, 300) + '...');
              logs.push(`✅ [Gemini AI 오디오 분석 완료] AI 분석 텍스트 수신 성공`);

              let cleanedText = resText;
              // Remove markdown code fences like ```json ... ``` or ``` ... ```
              if (cleanedText.includes('```')) {
                const match = cleanedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
                if (match) {
                  cleanedText = match[1].trim();
                } else {
                  cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
                }
              }

              try {
                const parsed = JSON.parse(cleanedText);
                if (parsed.sttScript) sttScript = parsed.sttScript;
                if (Array.isArray(parsed.summaries)) summaries = parsed.summaries;
                if (parsed.keyIssues) keyIssues = parsed.keyIssues;
                if (parsed.sentiment) sentiment = parsed.sentiment;
                console.log(`[CTI Gemini 파싱 성공] ✅ JSON 구조체 파싱 완료 (STT 길이: ${sttScript.length}자)`);
                logs.push(`✅ [Gemini AI 오디오 분석] JSON 구조체 파싱 성공`);
              } catch (parseErr) {
                console.warn(`[CTI Gemini 파싱 경고] ⚠️ JSON.parse 1차 실패, 정규식 구조 복구 시도...`);
                
                // 정규식 기반 안전 추출
                const sttMatch = cleanedText.match(/"sttScript"\s*:\s*"([\s\S]*?)"\s*,\s*"summaries"/i) || 
                                 cleanedText.match(/"sttScript"\s*:\s*"([\s\S]*?)"\s*,\s*"/i) ||
                                 cleanedText.match(/"sttScript"\s*:\s*"([\s\S]*?)"\s*\}/i);
                const sumMatch = cleanedText.match(/"summaries"\s*:\s*\[([\s\S]*?)\]/i);
                const keyMatch = cleanedText.match(/"keyIssues"\s*:\s*"([\s\S]*?)"/i);
                const sentMatch = cleanedText.match(/"sentiment"\s*:\s*"([\s\S]*?)"/i);

                if (sttMatch && sttMatch[1]) {
                  sttScript = sttMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                } else {
                  sttScript = cleanedText;
                }

                if (sumMatch && sumMatch[1]) {
                  const extracted = sumMatch[1].match(/"([^"\\]*(?:\\.[^"\\]*)*)"/g);
                  if (extracted && extracted.length > 0) {
                    summaries = extracted.map(s => s.slice(1, -1).replace(/\\"/g, '"').trim());
                  }
                }

                if (keyMatch && keyMatch[1]) keyIssues = keyMatch[1];
                if (sentMatch && sentMatch[1]) sentiment = sentMatch[1];

                summaries = summaries
                  .map(s => s.replace(/\*\*/g, '').replace(/^(?:[•\*\-]|[\d]+\.|\b\d+\b)+\s*/, '').trim())
                  .filter(s => s && !/^(?:\d+\)\s*)?(?:요약|핵심이슈|감정|STT)/i.test(s) && !/^\d+$/.test(s));

                console.log(`[CTI Gemini 파싱 복구 성공] ✅ 정규식 필드 추출 완료 (STT: ${sttScript.length}자, 요약: ${summaries.length}개)`);
                logs.push(`✅ [Gemini AI 오디오 분석] 정규식 필드 파싱 성공`);
              }
            } else {
              console.warn(`[CTI Gemini 최종 경고] ⚠️ 모든 모델에서 응답을 받지 못하여 기본 템플릿 반환`);
              logs.push(`ℹ️ [Gemini AI 오디오 분석] 모델 응답 미수신으로 기본 템플릿 반환`);
            }
          } catch (aiErr: any) {
            console.error(`[CTI Gemini 최상위 예외]:`, aiErr);
            logs.push(`⚠️ [Gemini AI 오디오 분석 예외]: ${aiErr?.message || aiErr}`);
          }
        } else {
          console.warn(`[CTI Server 분석 건너뜀] ⚠️ audioBuffer가 없거나 onlyMetadata=true 입니다. (audioBuffer: ${!!audioBuffer})`);
        }
      }

      const formattedReport = ctiCollectorService.buildFormattedReport({
        phoneNumber: phoneDisplay,
        callDateTime: targetRecord.callDateStr || new Date().toISOString().slice(0, 16).replace('T', ' '),
        extension: extName,
        filename: targetRecord.filename || 'cti_audio.mp3',
        summaries,
        keyIssues,
        sentiment,
        sttScript,
      });

      return res.json({
        success: true,
        records,
        record: targetRecord,
        summaries,
        keyIssues,
        sentiment,
        sttScript,
        formattedReport,
      });
    } catch (err: any) {
      console.error('[CTI Error]:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // 2. AI Call Summarizer API
  app.post('/api/ai/summarize', async (req, res) => {
    try {
      const { text, carNumber } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Text content is required' });
      }

      const ai = getGeminiAI();
      if (!ai) {
        return res.json({
          summary: `[Fallback] ${text.slice(0, 80)}...`,
          category: '일반 문의',
          keyIssues: ['데이터 분석 필요'],
          recommendedAction: '상담원 확인 필요',
        });
      }

      const prompt = `다음은 주차장 CS 상담 기록입니다.
이 기록을 분석하여 JSON 형식으로 결과를 출력해 주세요.

[차량번호]: ${carNumber || '확인불가'}
[상담기록]:
${text}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: '당신은 주차 CS 분석기입니다. JSON 형식으로만 응답해 주세요.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: '상담 기록의 3줄 요약',
              },
              category: {
                type: Type.STRING,
                description: '카테고리 분류 (정산오류, 이용문의, 원격제어 등)',
              },
              keyIssues: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '주요 문제 이슈 목록',
              },
              recommendedAction: {
                type: Type.STRING,
                description: '추천 해결방안 및 조치 사항',
              },
            },
            required: ['summary', 'category', 'keyIssues', 'recommendedAction'],
          },
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text.trim());
        return res.json(parsed);
      } else {
        throw new Error('No response text');
      }
    } catch (error) {
      console.error('Error calling Gemini AI Summarizer:', error);
      return res.json({
        summary: '[오류] AI 요약 처리 중 오류가 발생했습니다.',
        category: '일반 문의',
        keyIssues: ['분석 실패'],
        recommendedAction: '상담원 수동 확인 필요',
      });
    }
  });

  // 3. AI Morning Briefing API
  app.post('/api/ai/briefing', async (req, res) => {
    const agentName = req.body?.agentName || '상담사';
    try {
      const ai = getGeminiAI();

      if (!ai) {
        return res.json({
          briefing: `[기본 브리핑] ${agentName}님, 좋은 아침입니다! 금일 예약 및 주요 인입 문의 사항을 안내해 드립니다.`,
        });
      }

      const prompt = `${agentName}님을 위한 주차 CS 업무 시작 전 일일 모닝 브리핑 문구를 3~4줄로 친절하게 작성해 주세요.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
      });

      return res.json({ briefing: response.text || '브리핑 생성이 실패했습니다.' });
    } catch (err) {
      return res.json({
        briefing: `안녕하세요 ${agentName}님! 좋은 아침입니다. 오늘도 힘찬 하루 되세요!`,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();