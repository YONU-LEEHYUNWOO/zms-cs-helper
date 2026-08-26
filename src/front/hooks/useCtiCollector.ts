/**
 * ZMS CS Helper - CTI 녹취 수집 및 AI 분석 상태 관리 커스텀 훅 (useCtiCollector)
 * 
 * [역할 및 아키텍처]
 * - CtiAudioSummaryModal의 모든 복잡한 CTI 크롤링 API 연동 및 상태 트랙을 담당합니다.
 * - 6단계 수집 상태, Gemini API STT 분석 캐시, 내선번호 필터링 및 직접 MP3 링크 조회 기능 내장.
 */

import React, { useState, useEffect } from 'react';
import { getStoredGeminiApiKey } from '../../lib/utils/geminiApi';
import { CtiCallRecord } from '../../backend/services/cti/ctiCollectorService';

interface UseCtiCollectorProps {
  isOpen: boolean;
  customerPhone: string;
  agentName: string;
  onApplySummaryToNotes: (summaryText: string, fullTranscript?: string, audioFileName?: string, durationSec?: number) => void;
  onClose: () => void;
}

export const useCtiCollector = ({
  isOpen,
  customerPhone,
  agentName,
  onApplySummaryToNotes,
  onClose,
}: UseCtiCollectorProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [extensionInput, setExtensionInput] = useState<string>(() => localStorage.getItem('cti_extension') || '');
  const [ctiUserIdInput, setCtiUserIdInput] = useState<string>(() => localStorage.getItem('cti_user_id') || 'arsparking');
  const [ctiUserPwInput, setCtiUserPwInput] = useState<string>(() => localStorage.getItem('cti_user_pw') || 'arsparking');
  const [ctiSessionCookieInput, setCtiSessionCookieInput] = useState<string>(() => localStorage.getItem('cti_session_cookie') || '');
  const [isTestingLogin, setIsTestingLogin] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => getStoredGeminiApiKey(agentName));
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSearchingList, setIsSearchingList] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 파싱 및 수집된 CTI 통화 이력 리스트
  const [fetchedRecords, setFetchedRecords] = useState<CtiCallRecord[]>([]);
  const [selectedRecordIdx, setSelectedRecordIdx] = useState<string>('');
  const [extSearchKeyword, setExtSearchKeyword] = useState<string>('');
  const [callTypeFilter, setCallTypeFilter] = useState<'all' | 'in' | 'out' | 'failed_missed' | 'failed_cancel'>('all');
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [rawHtmlText, setRawHtmlText] = useState<string>('');
  const [showRawHtmlModal, setShowRawHtmlModal] = useState<boolean>(false);
  const [showDiagnosticLogsModal, setShowDiagnosticLogsModal] = useState<boolean>(false);
  // 직접 MP3 링크 열기 버튼 로딩 상태
  const [isLoadingMp3Link, setIsLoadingMp3Link] = useState<boolean>(false);

  // 상세 STT 분석 결과 보관 상태
  const [audioAnalysisResult, setAudioAnalysisResult] = useState<{
    summaries: string[];
    sttScript: string;
    keyIssues: string;
    sentiment: string;
    formattedReport: string;
    filename: string;
  } | null>(null);
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState<boolean>(false);

  // 통화별 분석 결과 캐시 (callIdx → 분석 결과 Map)
  const [callAnalysisCache, setCallAnalysisCache] = useState<Map<string, {
    summaries: string[];
    sttScript: string;
    keyIssues: string;
    sentiment: string;
    formattedReport: string;
    filename: string;
  }>>(new Map());

  // CTI 성공 / 실패 탭 분리 상태
  const [activeListTab, setActiveListTab] = useState<'success' | 'failed'>('success');
  // AI 분석 결과 탭 상태 ('summary': 핵심 요약, 'script': STT 대화록 전문)
  const [activeResultTab, setActiveResultTab] = useState<'summary' | 'script'>('summary');
  // AI CS 분석 모드 설정 ('metadata': 기본 CS 5줄 요약, 'stt': 상세 STT 및 오디오 분석)
  const [analysisMode, setAnalysisMode] = useState<'metadata' | 'stt'>('metadata');

  // 고객 전화번호 전달 시 100% 자동 프리필 (Pre-fill) 및 상담사 계정별 API Key 동기화
  useEffect(() => {
    if (isOpen) {
      const clean = (customerPhone || '').replace(/[^0-9]/g, '');
      if (clean) {
        const formatted = clean.length === 11
          ? `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7)}`
          : clean.length === 10
            ? `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`
            : clean;
        setPhoneInput(formatted);
      }
      setApiKeyInput(getStoredGeminiApiKey(agentName));
    }
  }, [isOpen, customerPhone, agentName]);

  // CTI 계정 정보 보관
  const handleSaveCtiSettings = () => {
    localStorage.setItem('cti_extension', extensionInput.trim());
    localStorage.setItem('cti_user_id', ctiUserIdInput.trim());
    localStorage.setItem('cti_user_pw', ctiUserPwInput.trim());
    localStorage.setItem('cti_session_cookie', ctiSessionCookieInput.trim());
    setToastMessage('✅ CTI 계정 및 세션 쿠키 정보가 로컬 세션에 저장되었습니다.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  /**
   * CTI 계정 로그인 테스트 & 세션 쿠키 수집 실행
   */
  const handleTestCtiLogin = async () => {
    setIsTestingLogin(true);
    setToastMessage(null);

    try {
      const payload = {
        ctiUserId: ctiUserIdInput.trim(),
        ctiUserPw: ctiUserPwInput.trim(),
        sessionCookie: ctiSessionCookieInput.trim(),
      };

      let response = await fetch('/api/cti/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.status === 404) {
        response = await fetch('http://localhost:3000/api/cti/test-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();
      if (Array.isArray(data.logs)) setDiagnosticLogs(data.logs);

      if (data.success && data.cookie) {
        setCtiSessionCookieInput(data.cookie);
        localStorage.setItem('cti_session_cookie', data.cookie);
        localStorage.setItem('cti_user_id', ctiUserIdInput.trim());
        localStorage.setItem('cti_user_pw', ctiUserPwInput.trim());
        setToastMessage(`✅ CTI 세션 쿠키 승인 성공! (${data.cookie})`);
      } else {
        setToastMessage(data.message || '❌ CTI 서버 로그인 인증에 실패했습니다.');
      }
    } catch (err: any) {
      setToastMessage(`⚠️ CTI 로그인 테스트 연동 안내: ${err?.message || err}`);
    } finally {
      setIsTestingLogin(false);
    }
  };

  /**
   * [1단계] CTI 서버 통화 이력 목록 파싱 조회 (search_only 모드)
   */
  const handleSearchCallList = async () => {
    const targetPhone = phoneInput || '';
    if (!targetPhone) {
      setToastMessage('⚠️ 조회할 고객 전화번호를 입력해 주세요.');
      return;
    }

    localStorage.setItem('cti_extension', extensionInput.trim());
    localStorage.setItem('cti_user_id', ctiUserIdInput.trim());
    localStorage.setItem('cti_user_pw', ctiUserPwInput.trim());
    localStorage.setItem('cti_session_cookie', ctiSessionCookieInput.trim());

    setIsSearchingList(true);
    setToastMessage(null);

    try {
      const payload = {
        phoneNumber: targetPhone,
        extensionFilter: extensionInput.trim() || undefined,
        ctiUserId: ctiUserIdInput.trim() || 'guest',
        ctiUserPw: ctiUserPwInput.trim() || 'guest1',
        sessionCookie: ctiSessionCookieInput.trim() || undefined,
        action: 'search_only',
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let response: Response;
      try {
        response = await fetch('/api/cti/process-recording', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (response.status === 404) {
          response = await fetch('http://localhost:3000/api/cti/process-recording', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
        }
      } finally {
        clearTimeout(timeoutId);
      }

      const responseText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        setToastMessage('⚠️ CTI 응답 처리 중 오류가 발생했습니다.');
        return;
      }

      if (Array.isArray(data.logs) && data.logs.length > 0) {
        setDiagnosticLogs(data.logs);
      }
      if (typeof data.rawHtmlText === 'string') {
        setRawHtmlText(data.rawHtmlText);
      }

      if (data.success && Array.isArray(data.records)) {
        const mapped: CtiCallRecord[] = data.records.map((item: any, i: number) => {
          const idx = item.callIdx || item.id || String(20520896 - i);
          const rawExt = item.fromExtension || item.extension || item.memberPhone || extensionInput.trim() || '7995';
          const cleanExt = rawExt.replace(/[^0-9]/g, '').slice(-4) || '7995';
          const memberP = item.memberPhone || (rawExt.startsWith('070') ? rawExt : `070-7931-${cleanExt}`);
          const guestP = item.guestPhone || targetPhone;
          const cleanGuestP = guestP.replace(/[^0-9]/g, '');
          const dStr = item.callDateStr || new Date().toISOString().slice(0, 16).replace('T', ' ');

          // 실제 통화 일시 파싱 (YYYYMM, DD, YYYYMMDD_HHMMSS)
          const dateClean = dStr.replace(/[^0-9]/g, '');
          const yyyymm = dateClean.length >= 6 ? dateClean.slice(0, 6) : '202608';
          const dd = dateClean.length >= 8 ? dateClean.slice(6, 8) : '14';
          const timePart = dateClean.length >= 14 ? dateClean.slice(8, 14) : (dateClean.length >= 12 ? `${dateClean.slice(8, 12)}00` : '111543');
          const fullDateTimeStr = `${yyyymm}${dd}_${timePart}`;

          // callType (out/in) 별 From, To 위치 교정
          const callType: 'in' | 'out' = item.callType === 'in' ? 'in' : 'out';
          const fromNum = callType === 'out' ? cleanExt : cleanGuestP;
          const toNum = callType === 'out' ? cleanGuestP : cleanExt;

          // 오디오 파일 확장자 (.mp3 우선, .wav 지원)
          const extType = (item.filename && item.filename.endsWith('.wav')) ? 'wav' : 'mp3';
          const fallbackFilename = `${fullDateTimeStr}_From${fromNum}_To${toNum}.${extType}`;
          const fUrl = item.fullUrl && !item.fullUrl.includes('20520896') && !item.fullUrl.endsWith('00.mp3')
            ? item.fullUrl
            : (item.relativeUrl ? `http://202.30.232.240${item.relativeUrl}` : '');

          return {
            callIdx: String(idx),
            companyName: item.companyName || '주차장만드는사람들 주식회사',
            userName: item.userName || '주차장만드는사람들',
            memberPhone: memberP,
            guestPhone: guestP,
            callDateStr: dStr,
            callEndDateStr: item.callEndDateStr || '',
            callType,
            durationStr: item.durationStr || '27초',
            statusText: item.statusText || '통화성공',
            detailUrl: item.detailUrl || `detail_view.jsp?call_idx=${idx}`,
            mp3Url: item.mp3Url || item.relativeUrl || '',
            fullUrl: fUrl,
            filename: item.filename || fallbackFilename,
            isSimulation: !!item.isSimulation,
            isFailed: !!item.isFailed,
          };
        });

        setFetchedRecords(mapped);
        if (mapped.length > 0) {
          setSelectedRecordIdx(mapped[0].callIdx);
          setToastMessage(`✅ CTI 통화 이력 수집 완료 (총 ${mapped.length}건)`);
        } else {
          setSelectedRecordIdx('');
          if (data.rawHtmlText && data.rawHtmlText.includes('top.location.href="/index.jsp"')) {
            setToastMessage('⚠️ CTI 로그인 세션이 승인되지 않은 상태입니다. [계정 변경] ➔ [🧪 CTI 계정 로그인 테스트]를 먼저 진행해 주세요.');
          } else {
            setToastMessage(`ℹ️ 입력하신 고객 전화번호(${targetPhone})의 CTI 통화 이력이 0건 발견되었습니다.`);
          }
        }
      } else {
        setFetchedRecords([]);
        setSelectedRecordIdx('');
        if (data.rawHtmlText && data.rawHtmlText.includes('top.location.href="/index.jsp"')) {
          setToastMessage('⚠️ CTI 세션이 만료되었습니다. [계정 변경] ➔ [🧪 CTI 계정 로그인 테스트]를 진행해 주세요.');
        } else {
          setToastMessage(`ℹ️ CTI 서버 조회 완료: 입력하신 번호(${targetPhone})의 통화 기록이 0건입니다.`);
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setToastMessage('⚠️ CTI 서버 응답 시간 초과: CTI 네트워크 상태를 확인해 주세요.');
      } else {
        setToastMessage(`⚠️ CTI 연동 안내: ${e.message}`);
      }
    } finally {
      setIsSearchingList(false);
    }
  };

  /**
   * [2단계] 선택 통화건 Gemini AI 분석 실행 & 메모장 반영
   */
  const handleAnalyzeSelectedCall = async (onlyMetadata: boolean = true) => {
    const targetPhone = phoneInput || parsedPhone || '';
    if (!targetPhone && !selectedFile && fetchedRecords.length === 0) {
      setToastMessage('⚠️ 분석할 통화건을 선택하거나 오디오 파일을 업로드해 주세요.');
      return;
    }

    if (onlyMetadata) {
      setIsAnalyzing(true);
    } else {
      setIsAnalyzingAudio(true);
    }
    setToastMessage(null);
    setDiagnosticLogs([`[1단계] CTI AI 분석 요청 시작 (${new Date().toLocaleTimeString()})`]);

    try {
      // 선택된 레코드에서 이미 추출된 실제 fullUrl이 있으면 전달
      const selectedRec = fetchedRecords.find(r => r.callIdx === selectedRecordIdx);
      const preKnownMp3Url = selectedRec?.fullUrl && !selectedRec.fullUrl.includes('20520896') && !selectedRec.fullUrl.endsWith('00.mp3') ? selectedRec.fullUrl : undefined;

      const apiKey = apiKeyInput.trim() || getStoredGeminiApiKey(agentName);

      if (!apiKey) {
        setDiagnosticLogs(prev => [...prev, '⚠️ [주의] Gemini API 키가 지정되지 않았습니다. [🔑 Gemini API Key 설정]에 키를 입력하여 저장해 주세요.']);
      } else {
        setDiagnosticLogs(prev => [...prev, `✅ [Gemini Key 확인] 키 길이: ${apiKey.length}자 (${apiKey.slice(0, 6)}...)`]);
      }

      const payload = {
        phoneNumber: targetPhone,
        extensionFilter: extensionInput.trim() || undefined,
        ctiUserId: ctiUserIdInput.trim() || 'arsparking',
        ctiUserPw: ctiUserPwInput.trim() || 'arsparking',
        sessionCookie: ctiSessionCookieInput.trim() || undefined,
        selectedCallIdx: selectedRecordIdx || undefined,
        preKnownMp3Url,
        onlyMetadata,
        userGeminiKey: apiKey || undefined,
        action: 'analyze_record',
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      let response: Response;
      try {
        setDiagnosticLogs(prev => [...prev, '[2단계] Vercel 백엔드 /api/cti/process-recording 호스팅 요청 전송...']);
        response = await fetch('/api/cti/process-recording', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (response.status === 404) {
          setDiagnosticLogs(prev => [...prev, '⚠️ [/api/cti 404 감지: 로컬 개발 서버 폴백 시도...]']);
          response = await fetch('http://localhost:3000/api/cti/process-recording', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
        }
      } catch (netErr: any) {
        const netMsg = netErr.name === 'AbortError' ? '네트워크 응답 시간 초과 (45초 타임아웃)' : netErr.message;
        setDiagnosticLogs(prev => [...prev, `❌ [네트워크 통신 오류]: ${netMsg}`]);
        setToastMessage(`⚠️ CTI 백엔드 통신 에러: ${netMsg}`);
        return;
      } finally {
        clearTimeout(timeoutId);
      }

      const responseText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        const errSnippet = responseText.slice(0, 250);
        setDiagnosticLogs(prev => [...prev, `❌ [JSON 파싱 실패 (HTTP ${response.status})]: ${errSnippet}`]);
        setToastMessage(`⚠️ 서버 응답 에러 (HTTP ${response.status}): ${errSnippet}`);
        return;
      }

      if (data.logs && Array.isArray(data.logs)) {
        setDiagnosticLogs(data.logs);
      }

      if (data.success) {
        if (data.record && data.record.fullUrl) {
          setFetchedRecords(prev =>
            prev.map(r => r.callIdx === data.record.callIdx ? { ...r, fullUrl: data.record.fullUrl, mp3Url: data.record.mp3Url } : r)
          );
        }

        const reportText = data.formattedReport || data.summary || (Array.isArray(data.summaries) ? data.summaries.join('\n') : '');
        const filename = data.record?.filename || data.selectedRecord?.filename || 'cti_auto_record.mp3';

        if (onlyMetadata) {
          onApplySummaryToNotes(
            reportText,
            data.sttScript,
            filename,
            0
          );
          onClose();
        } else {
          const analysisObj = {
            summaries: data.summaries || [reportText],
            sttScript: data.sttScript || '',
            keyIssues: data.keyIssues || '',
            sentiment: data.sentiment || '',
            formattedReport: reportText,
            filename: filename,
          };
          if (selectedRecordIdx) {
            setCallAnalysisCache(prev => new Map(prev).set(selectedRecordIdx, analysisObj));
          }
          setAudioAnalysisResult(analysisObj);
          setActiveResultTab('summary');
          setToastMessage('✅ 상세 STT 대화록 추출이 성공적으로 완료되었습니다! 우측 패널에서 결과를 확인하세요.');
        }
      } else {
        const failMsg = data.message || '선택한 녹취 분석에 실패했습니다.';
        setDiagnosticLogs(prev => [...prev, `❌ [분석 실패]: ${failMsg}`]);
        setToastMessage(`⚠️ ${failMsg}`);
      }
    } catch (e: any) {
      setDiagnosticLogs(prev => [...prev, `❌ [예외 오류]: ${e.message}`]);
      setToastMessage(`⚠️ AI 분석 중 오류가 발생했습니다: ${e.message}`);
    } finally {
      setIsAnalyzing(false);
      setIsAnalyzingAudio(false);
    }
  };

  /**
   * CTI 검색 초기화 버튼 핸들러
   */
  const handleResetSearch = () => {
    setPhoneInput('');
    setFetchedRecords([]);
    setSelectedRecordIdx('');
    setExtSearchKeyword('');
    setCallTypeFilter('all');
    setRawHtmlText('');
    setDiagnosticLogs([]);
    setSelectedFile(null);
    setAudioAnalysisResult(null);
    setToastMessage('🔍 검색이 초기화되었습니다. 새로운 고객 전화번호로 조회할 수 있습니다.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const parsePhoneFromFileName = (name: string): string | null => {
    const fromMatch = name.match(/From(01[0-9]{9})/i);
    if (fromMatch) {
      const raw = fromMatch[1];
      return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`;
    }
    const directMatch = name.match(/(01[0-9]-[0-9]{3,4}-[0-9]{4})/);
    if (directMatch) return directMatch[1];
    const rawMatch = name.match(/(01[0-9]{9})/);
    if (rawMatch) {
      const raw = rawMatch[1];
      return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`;
    }
    return null;
  };

  const parsedPhone = selectedFile ? parsePhoneFromFileName(selectedFile.name) : null;

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav)$/i)) {
      setToastMessage('⚠️ .mp3 또는 .wav 오디오 파일만 지원합니다.');
      return;
    }
    setSelectedFile(file);
  };

  const handleOpenCtiServer = () => {
    window.open('http://202.30.232.240/dial/call_list.jsp', '_blank', 'noopener,noreferrer');
  };

  /**
   * 직접 MP3 링크 열기 버튼 핸들러
   */
  const handleOpenMp3Link = async () => {
    if (!selectedRecord) return;

    setIsLoadingMp3Link(true);
    setToastMessage(null);
    try {
      let response = await fetch('/api/cti/get-mp3-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callIdx: selectedRecord.callIdx,
          ctiUserId: ctiUserIdInput.trim() || 'arsparking',
          ctiUserPw: ctiUserPwInput.trim() || 'arsparking',
          sessionCookie: ctiSessionCookieInput.trim() || undefined,
        }),
      });
      if (response.status === 404) {
        response = await fetch('http://localhost:3000/api/cti/get-mp3-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callIdx: selectedRecord.callIdx,
            ctiUserId: ctiUserIdInput.trim() || 'arsparking',
            ctiUserPw: ctiUserPwInput.trim() || 'arsparking',
            sessionCookie: ctiSessionCookieInput.trim() || undefined,
          }),
        });
      }
      const data = await response.json();
      if (data.success && data.mp3Url) {
        setFetchedRecords(prev => prev.map(r =>
          r.callIdx === selectedRecord.callIdx
            ? { ...r, fullUrl: data.mp3Url, mp3Url: data.mp3Url, filename: data.mp3Url.split('/').pop() || r.filename }
            : r
        ));
        setToastMessage('✅ MP3 URL 조회 성공 - 새 탭에서 열립니다.');
        window.open(data.mp3Url, '_blank', 'noopener,noreferrer');
      } else {
        setToastMessage(`ℹ️ URL 재조회 실패: ${data.message || '기존 URL로 시도합니다.'}`);
        if (selectedRecord.fullUrl) window.open(selectedRecord.fullUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      setToastMessage(`⚠️ MP3 링크 조회 오류: ${err?.message || err}`);
      if (selectedRecord.fullUrl) window.open(selectedRecord.fullUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setIsLoadingMp3Link(false);
    }
  };

  const filteredRecords = fetchedRecords.filter((rec) => {
    const matchTab = activeListTab === 'success' ? !rec.isFailed : !!rec.isFailed;
    if (!matchTab) return false;

    const cleanKw = extSearchKeyword.trim().replace(/[^0-9]/g, '');
    const matchKw = !cleanKw || rec.memberPhone.replace(/[^0-9]/g, '').includes(cleanKw);
    if (!matchKw) return false;

    if (callTypeFilter === 'all') return true;
    if (callTypeFilter === 'in') return rec.callType === 'in';
    if (callTypeFilter === 'out') return rec.callType === 'out';
    if (callTypeFilter === 'failed_missed') return rec.isFailed && /부재중|무응답|실패|통화중/i.test(rec.statusText);
    if (callTypeFilter === 'failed_cancel') return rec.isFailed && /취소/i.test(rec.statusText);

    return true;
  });

  const selectedRecord = filteredRecords.find(r => r.callIdx === selectedRecordIdx) || filteredRecords[0];

  return {
    selectedFile,
    setSelectedFile,
    phoneInput,
    setPhoneInput,
    extensionInput,
    setExtensionInput,
    ctiUserIdInput,
    setCtiUserIdInput,
    ctiUserPwInput,
    setCtiUserPwInput,
    ctiSessionCookieInput,
    setCtiSessionCookieInput,
    isTestingLogin,
    isDragOver,
    apiKeyInput,
    setApiKeyInput,
    isAnalyzing,
    isSearchingList,
    toastMessage,
    setToastMessage,
    fetchedRecords,
    setFetchedRecords,
    selectedRecordIdx,
    setSelectedRecordIdx,
    extSearchKeyword,
    setExtSearchKeyword,
    callTypeFilter,
    setCallTypeFilter,
    diagnosticLogs,
    rawHtmlText,
    showRawHtmlModal,
    setShowRawHtmlModal,
    showDiagnosticLogsModal,
    setShowDiagnosticLogsModal,
    isLoadingMp3Link,
    audioAnalysisResult,
    setAudioAnalysisResult,
    isAnalyzingAudio,
    setIsAnalyzingAudio,
    callAnalysisCache,
    setCallAnalysisCache,
    activeListTab,
    setActiveListTab,
    activeResultTab,
    setActiveResultTab,
    analysisMode,
    setAnalysisMode,
    parsedPhone,
    filteredRecords,
    selectedRecord,
    handleSaveCtiSettings,
    handleTestCtiLogin,
    handleSearchCallList,
    handleAnalyzeSelectedCall,
    handleResetSearch,
    handleOpenCtiServer,
    handleOpenMp3Link,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
};
