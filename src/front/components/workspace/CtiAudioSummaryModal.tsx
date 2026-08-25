/**
 * ZMS CS Helper - CTI 녹취 검색 및 원클릭 AI 음성 요약 모달 (CtiAudioSummaryModal)
 * 
 * [주요 기능 및 UX 표준]
 * - CTI 녹취 서버(http://202.30.232.240) 로그인 계정(ctiUserId / ctiUserPw) 및 내선번호 지원
 * - 고객 전화번호(customerPhone) 100% 자동 프리필(Pre-fill)
 * - 6단계 CTI 크롤링 파이프라인으로 id="table01" 10개 셀 정밀 파싱 표출
 * - 상담원 내선전화(070-7931-XXXX) 뱃지 표출 및 실시간 내선 키워드 필터링
 * - 선택된 통화건 MP3 직접 듣기 오디오 플레이어 UI 제공
 * - Rule 8 준수: 최상위 백드롭 딤 클릭 닫기 바인딩
 */

import React, { useState, useEffect } from 'react';
import {
  Mic, ExternalLink, Upload, Sparkles,
  X, AlertCircle, CheckCircle2, Loader2, PhoneCall, Download, Search, PhoneIncoming, PhoneOutgoing, PlayCircle, Key, Lock, User, Terminal, FileText, Copy, Check, Code, Zap
} from 'lucide-react';
import { getStoredGeminiApiKey, setStoredGeminiApiKey, analyzeCtiAudioCallLog } from '../../../lib/utils/geminiApi';
import { CtiCallRecord } from '../../../backend/services/cti/ctiCollectorService';
import { CtiRecordTable } from './CtiRecordTable';
import { CtiDetailPanel } from './CtiDetailPanel';

import { InternalAgent } from '../../../backend/types';

interface CtiAudioSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerPhone?: string; // 선택 고객 전화번호 (100% 자동 프리필)
  agentName?: string;
  agentPhone?: string;
  agents?: InternalAgent[];
  onApplySummaryToNotes: (summaryText: string, fullTranscript?: string, audioFileName?: string, durationSec?: number) => void;
}

export const CtiAudioSummaryModal: React.FC<CtiAudioSummaryModalProps> = ({
  isOpen,
  onClose,
  customerPhone = '',
  agentName = '담당 상담사',
  agentPhone = '02-1544-0000',
  agents = [],
  onApplySummaryToNotes,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [extensionInput, setExtensionInput] = useState<string>(() => localStorage.getItem('cti_extension') || '');
  const [ctiUserIdInput, setCtiUserIdInput] = useState<string>(() => localStorage.getItem('cti_user_id') || 'arsparking');
  const [ctiUserPwInput, setCtiUserPwInput] = useState<string>(() => localStorage.getItem('cti_user_pw') || 'arsparking');
  const [ctiSessionCookieInput, setCtiSessionCookieInput] = useState<string>(() => localStorage.getItem('cti_session_cookie') || '');
  const [isTestingLogin, setIsTestingLogin] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => getStoredGeminiApiKey(agentName));
  const [showApiKeyConfig, setShowApiKeyConfig] = useState<boolean>(false);
  const [showCtiAccountConfig, setShowCtiAccountConfig] = useState<boolean>(false);
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
  const [isCopiedRaw, setIsCopiedRaw] = useState<boolean>(false);
  // 직접 MP3 링크 열기 버튼 로딩 상태 (Rules of Hooks: early return 이전에 선언)
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

  if (!isOpen) return null;

  // CTI 계정 정보 보관
  const handleSaveCtiSettings = () => {
    localStorage.setItem('cti_extension', extensionInput.trim());
    localStorage.setItem('cti_user_id', ctiUserIdInput.trim());
    localStorage.setItem('cti_user_pw', ctiUserPwInput.trim());
    localStorage.setItem('cti_session_cookie', ctiSessionCookieInput.trim());
    setToastMessage('✅ CTI 계정 및 세션 쿠키 정보가 로컬 세션에 저장되었습니다.');
    setShowCtiAccountConfig(false);
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

      // AI 음성 분석 = 크롤링(~5초) + 다운로드(~5초) + Gemini 분석(~12초) + 여유 = 45초
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
        // 실시간으로 획득한 실제 오디오 URL을 통화 목록에 반영하여 404 오류 방지
        if (data.record && data.record.fullUrl) {
          setFetchedRecords(prev =>
            prev.map(r => r.callIdx === data.record.callIdx ? { ...r, fullUrl: data.record.fullUrl, mp3Url: data.record.mp3Url } : r)
          );
        }

        const reportText = data.formattedReport || data.summary || (Array.isArray(data.summaries) ? data.summaries.join('\n') : '');
        const filename = data.record?.filename || data.selectedRecord?.filename || 'cti_auto_record.mp3';

        if (onlyMetadata) {
          // 1) 기본 메타데이터 요약 모드: 결과를 즉시 메모장에 반영하고 모달 닫기
          onApplySummaryToNotes(
            reportText,
            data.sttScript,
            filename,
            0
          );
          onClose();
        } else {
          // 2) 상세 STT 모드: 모달 내부 상태에 임시 저장하고 화면에 대화록 노출
          setAudioAnalysisResult({
            summaries: data.summaries || [reportText],
            sttScript: data.sttScript || '',
            keyIssues: data.keyIssues || '',
            sentiment: data.sentiment || '',
            formattedReport: reportText,
            filename: filename,
          });
          setToastMessage('✅ 상세 STT 대화록 추출이 성공적으로 완료되었습니다! 아래 결과를 확인한 뒤 반영해 주세요.');
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
   * - 다른 번호 등으로 검색하기 위해 기존 검색 입력, 결과 및 오디오 분석 캐시 초기화
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
   * - /api/cti/get-mp3-url 경량 엔드포인트로 단건 detail_view URL 실시간 조회
   * - 전체 파이프라인 재수행 없이 callIdx만 전달하여 빠르게 실제 URL 획득
   */
  const handleOpenMp3Link = async () => {
    if (!selectedRecord) return;

    setIsLoadingMp3Link(true);
    setToastMessage(null);
    try {
      // /api/cti/get-mp3-url 경량 API 호출 (단건 detail_view 조회만)
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
        // fetchedRecords 내 해당 레코드 fullUrl 실시간 갱신 (다음 AI 분석 시에도 올바른 URL 사용)
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
    // 탭 구분
    const matchTab = activeListTab === 'success' ? !rec.isFailed : !!rec.isFailed;
    if (!matchTab) return false;

    // 내선 키워드 필터링
    const cleanKw = extSearchKeyword.trim().replace(/[^0-9]/g, '');
    const matchKw = !cleanKw || rec.memberPhone.replace(/[^0-9]/g, '').includes(cleanKw);
    if (!matchKw) return false;

    // 구분 필터링
    if (callTypeFilter === 'all') return true;
    if (callTypeFilter === 'in') return rec.callType === 'in';
    if (callTypeFilter === 'out') return rec.callType === 'out';
    if (callTypeFilter === 'failed_missed') return rec.isFailed && /부재중|무응답|실패|통화중/i.test(rec.statusText);
    if (callTypeFilter === 'failed_cancel') return rec.isFailed && /취소/i.test(rec.statusText);

    return true;
  });

  const selectedRecord = filteredRecords.find(r => r.callIdx === selectedRecordIdx) || filteredRecords[0];

  return (
    // Rule 8 준수: 최상위 백드롭 딤 클릭 닫기 바인딩
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* 내부 컨텐츠 클릭 시 이벤트 버블링 차단 */}
      <div
        className="w-full max-w-[95vw] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 📌 모달 헤더 */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>CTI 녹취 자동 수집 및 AI 음성 분석</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-mono">
                  http://202.30.232.240
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                고객 전화번호로 통화 목록을 검색하고 상담사 내선 및 MP3 음성을 확인합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 📌 CTI 계정 설정 바 */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              CTI 로그인 계정: <span className="font-mono text-indigo-900">{ctiUserIdInput || 'admin'}</span>
            </span>
            <button
              onClick={() => setShowCtiAccountConfig(!showCtiAccountConfig)}
              className="text-[11px] text-indigo-600 font-bold hover:underline cursor-pointer"
            >
              [계정 변경]
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowApiKeyConfig(!showApiKeyConfig)}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <Key className="w-3 h-3 text-indigo-600" />
              <span>🔑 Gemini API Key 설정</span>
            </button>
            <button
              onClick={() => setShowDiagnosticLogsModal(true)}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <Terminal className="w-3 h-3 text-indigo-600" />
              <span>📋 진단 로그 ({diagnosticLogs.length}건)</span>
            </button>
            <button
              onClick={handleOpenCtiServer}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <ExternalLink className="w-3 h-3 text-indigo-600" />
              CTI 웹서버 열기
            </button>
          </div>
        </div>

        {/* 📢 토스트 및 시스템 에러 알림 바 */}
        {toastMessage && (
          <div className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between gap-2 border-b animate-in fade-in duration-150 ${
            toastMessage.startsWith('✅')
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : toastMessage.startsWith('⚠️') || toastMessage.startsWith('❌')
                ? 'bg-rose-50 text-rose-900 border-rose-200'
                : 'bg-indigo-50 text-indigo-900 border-indigo-200'
          }`}>
            <div className="flex items-center gap-2">
              {toastMessage.startsWith('✅') ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{toastMessage}</span>
            </div>
            <div className="flex items-center gap-2">
              {diagnosticLogs.length > 0 && (
                <button
                  onClick={() => setShowDiagnosticLogsModal(true)}
                  className="text-[11px] underline text-indigo-700 hover:text-indigo-900 font-bold cursor-pointer"
                >
                  [📋 진단 로그 뷰어 열기]
                </button>
              )}
              <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 🔑 Gemini API Key 설정 & Google AI Studio 무료 발급 가이드 팝업 */}
        {showApiKeyConfig && (
          <div className="px-6 py-3 bg-indigo-50 border-b border-indigo-200 flex flex-col gap-2 animate-fade-in text-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-indigo-600" />
                🔑 내 개별 Gemini API Key (오디오 STT 분석용)
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline flex items-center gap-1 bg-white px-2.5 py-1 rounded-md border border-indigo-200 shadow-2xs cursor-pointer"
              >
                <span>🌐 Google AI Studio 무료 Key 발급 받기</span>
                <ExternalLink className="w-3 h-3 text-indigo-600" />
              </a>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy... (내 전용 API Key 입력 시 2~3초 초고속 STT 구동)"
                className="flex-1 px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-mono font-bold text-slate-800"
              />
              <button
                onClick={() => {
                  setStoredGeminiApiKey(apiKeyInput, agentName);
                  setToastMessage('✅ 내 계정 전용 Gemini API Key가 저장되었습니다.');
                  setShowApiKeyConfig(false);
                }}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all cursor-pointer shrink-0"
              >
                저장
              </button>
            </div>
          </div>
        )}

        {/* 🔐 CTI 계정 수정 패널 */}
        {showCtiAccountConfig && (
          <div className="px-6 py-3 bg-indigo-50 border-b border-indigo-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-fade-in text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-indigo-950 shrink-0">🔐 CTI 접속 계정:</span>
              <input
                type="text"
                value={ctiUserIdInput}
                onChange={(e) => setCtiUserIdInput(e.target.value)}
                placeholder="CTI 아이디"
                className="px-2.5 py-1 bg-white border border-indigo-300 rounded-lg text-xs font-mono w-24"
              />
              <input
                type="password"
                value={ctiUserPwInput}
                onChange={(e) => setCtiUserPwInput(e.target.value)}
                placeholder="CTI 비밀번호"
                className="px-2.5 py-1 bg-white border border-indigo-300 rounded-lg text-xs font-mono w-24"
              />
              <input
                type="text"
                value={ctiSessionCookieInput}
                onChange={(e) => setCtiSessionCookieInput(e.target.value)}
                placeholder="JSESSIONID=... (직접 입력 / 자동 세션 보관)"
                className="px-2.5 py-1 bg-white border border-indigo-300 rounded-lg text-xs font-mono w-56"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestCtiLogin}
                disabled={isTestingLogin}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                {isTestingLogin ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>인증 검증 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-slate-900" />
                    <span>🧪 CTI 계정 로그인 테스트</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSaveCtiSettings}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer"
              >
                설정 저장
              </button>
            </div>
          </div>
        )}

        {/* 📌 모달 바디 (성공/실패 분리 및 제어 패널 단일화 2열 구조) */}
        <div className="flex-1 flex overflow-hidden min-h-0 bg-slate-50 border-t border-slate-200">

          {/* ◀ 왼쪽 열: 검색조건 및 수집된 목록 (CtiRecordTable 컴포넌트로 분리 완료) */}
          <CtiRecordTable
            agents={agents}
            phoneInput={phoneInput}
            setPhoneInput={setPhoneInput}
            extensionInput={extensionInput}
            setExtensionInput={setExtensionInput}
            isSearchingList={isSearchingList}
            rawHtmlText={rawHtmlText}
            setShowRawHtmlModal={setShowRawHtmlModal}
            handleSearchCallList={handleSearchCallList}
            fetchedRecords={fetchedRecords}
            activeListTab={activeListTab}
            setActiveListTab={setActiveListTab}
            setSelectedRecordIdx={setSelectedRecordIdx}
            selectedRecordIdx={selectedRecordIdx}
            callTypeFilter={callTypeFilter}
            setCallTypeFilter={setCallTypeFilter}
            extSearchKeyword={extSearchKeyword}
            setExtSearchKeyword={setExtSearchKeyword}
            filteredRecords={filteredRecords}
            callAnalysisCache={callAnalysisCache}
            isAnalyzingAudio={isAnalyzingAudio}
            handleAnalyzeSelectedCall={handleAnalyzeSelectedCall}
            setAudioAnalysisResult={setAudioAnalysisResult}
            setActiveResultTab={setActiveResultTab}
            setToastMessage={setToastMessage}
            ctiUserIdInput={ctiUserIdInput}
            ctiUserPwInput={ctiUserPwInput}
            ctiSessionCookieInput={ctiSessionCookieInput}
            setFetchedRecords={setFetchedRecords}
            setIsAnalyzingAudio={setIsAnalyzingAudio}
            setCallAnalysisCache={setCallAnalysisCache}
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            isDragOver={isDragOver}
            handleDragOver={handleDragOver}
            handleDragLeave={handleDragLeave}
            handleDrop={handleDrop}
            handleResetSearch={handleResetSearch}
          />

          {/* ▶ 오른쪽 열: 선택 통화 정보, 오디오 재생 및 AI 분석 제어판 */}
          <CtiDetailPanel
            agents={agents}
            selectedRecord={selectedRecord}
            selectedFile={selectedFile}
            isLoadingMp3Link={isLoadingMp3Link}
            handleOpenMp3Link={handleOpenMp3Link}
            audioAnalysisResult={audioAnalysisResult}
            isAnalyzingAudio={isAnalyzingAudio}
            isAnalyzing={isAnalyzing}
            handleAnalyzeSelectedCall={handleAnalyzeSelectedCall}
            activeResultTab={activeResultTab}
            setActiveResultTab={setActiveResultTab}
            setToastMessage={setToastMessage}
          />
        </div>

          {/* 📌 하단 푸터 버튼 */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
            <div className="text-xs text-slate-500">
              {fetchedRecords.length > 0 && selectedRecordIdx && (
                <span className="font-bold text-indigo-900">
                  선택된 통화 ID: <span className="font-mono">{selectedRecordIdx}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                disabled={isAnalyzing || isSearchingList}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
              >
                취소
              </button>

              <button
                onClick={() => {
                  if (audioAnalysisResult) {
                    onApplySummaryToNotes(
                      audioAnalysisResult.formattedReport,
                      audioAnalysisResult.sttScript,
                      audioAnalysisResult.filename,
                      0
                    );
                    onClose();
                  } else {
                    handleAnalyzeSelectedCall(false);
                  }
                }}
                disabled={isAnalyzingAudio || isSearchingList || (fetchedRecords.length === 0 && !selectedFile && !phoneInput)}
                className="px-5 py-2 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isAnalyzingAudio ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Gemini AI 음성 분석 진행 중...
                  </>
                ) : audioAnalysisResult ? (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
                    ✨ 분석 결과 워크스페이스 반영 및 닫기
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 text-amber-300" />
                    🎙️ AI 음성 녹취 분석 실행
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 📄 CTI 서버 수신 Raw HTML 원문 보기 모달 */}
        {showRawHtmlModal && (
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setShowRawHtmlModal(false)}
          >
            <div
              className="bg-slate-900 text-slate-100 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-slate-700 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 모달 헤더 */}
              <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    <span>📄 CTI 서버 수신 Raw HTML 원문 뷰어</span>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[11px] font-mono">
                      {rawHtmlText ? `${rawHtmlText.length} bytes` : '0 bytes'}
                    </span>
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(rawHtmlText);
                      setIsCopiedRaw(true);
                      setTimeout(() => setIsCopiedRaw(false), 2000);
                    }}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {isCopiedRaw ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">복사 완료!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>📋 코드 전체 복사</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setShowRawHtmlModal(false)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 모달 내용 */}
              <div className="p-5 flex-1 overflow-y-auto custom-scroll bg-slate-950 space-y-3 font-mono text-xs">
                {rawHtmlText.includes('top.location.href="/index.jsp"') && (
                  <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      <strong>⚠️ 세션 미승인 리다이렉트 감지:</strong> CTI 서버가 로그인되지 않은 상태이므로 세션 만료 스크립트 <code>top.location.href="/index.jsp"</code>가 반환되었습니다. CTI 계정 아이디/비밀번호를 확인해 주세요.
                    </span>
                  </div>
                )}

                <pre className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed custom-scroll select-text">
                  <code>{rawHtmlText || 'CTI 서버로부터 수신된 HTML 원문 데이터가 없습니다. [🔍 CTI 통화 이력 조회]를 먼저 실행해 주세요.'}</code>
                </pre>
              </div>

              {/* 모달 푸터 */}
              <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>http://202.30.232.240/dial/call_list.jsp 직수신 원문 데이터</span>
                <button
                  onClick={() => setShowRawHtmlModal(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition-all cursor-pointer"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
        {/* 📋 CTI & Gemini AI 실시간 진단 로그 뷰어 모달 */}
        {showDiagnosticLogsModal && (
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setShowDiagnosticLogsModal(false)}
          >
            <div
              className="bg-slate-900 text-slate-100 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-slate-700 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 모달 헤더 */}
              <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    <span>📋 CTI 크롤링 & Gemini AI 실시간 진단 로그</span>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[11px] font-mono">
                      총 {diagnosticLogs.length}건
                    </span>
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(diagnosticLogs.join('\n'));
                      setIsCopiedRaw(true);
                      setTimeout(() => setIsCopiedRaw(false), 2000);
                    }}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {isCopiedRaw ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">복사 완료!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>📋 로그 전체 복사</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setShowDiagnosticLogsModal(false)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 모달 내용 */}
              <div className="p-5 flex-1 overflow-y-auto custom-scroll bg-slate-950 space-y-2 font-mono text-xs">
                {diagnosticLogs.length === 0 ? (
                  <p className="text-slate-500 text-center py-6">수집된 진단 로그가 없습니다. CTI 검색 또는 AI 분석을 실행해 주세요.</p>
                ) : (
                  diagnosticLogs.map((logLine, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg text-[11px] leading-relaxed select-text ${
                        logLine.includes('❌') || logLine.includes('⚠️') || logLine.includes('실패') || logLine.includes('에러')
                          ? 'bg-rose-950/60 text-rose-300 border border-rose-900/60 font-bold'
                          : logLine.includes('✅') || logLine.includes('성공')
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-900/60 font-bold'
                            : 'bg-slate-900 text-slate-300 border border-slate-800'
                      }`}
                    >
                      {logLine}
                    </div>
                  ))
                )}
              </div>

              {/* 모달 푸터 */}
              <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Vercel Serverless /api/cti & Client Gemini API Diagnostic Trace</span>
                <button
                  onClick={() => setShowDiagnosticLogsModal(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition-all cursor-pointer"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};
