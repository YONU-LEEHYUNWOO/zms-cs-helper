/**
 * ZMS CS Helper - 사내 서비스 사용 가이드 & 이용 매뉴얼 모달 (ServiceUserGuideModal)
 * 
 * [역할 및 아키텍처 위치]
 * - src/front/components/support/ServiceUserGuideModal.tsx
 * - 로그인 후 및 사이드바 1클릭 실행 매뉴얼 모달
 * - 가독성을 높인 직관적 4대 주제 탭:
 *   1) 상담 등록 & 워크스페이스
 *   2) 업무 & TODO 관제
 *   3) CTI 수집 & Gemini AI 분석
 *   4) 캘린더, 칸반 & 실시간 협업
 * - Rule 8 준수: 백드롭 딤 클릭 닫기 (onClick={onClose} & e.stopPropagation())
 */

import React, { useState } from 'react';
import {
  X,
  BookOpen,
  LayoutDashboard,
  PhoneCall,
  Kanban,
  Users,
  CheckCircle2,
  Sparkles,
  Zap,
  ArrowRight,
  AlertTriangle,
  Clock,
  Lock,
  CheckSquare,
  Key,
  ShieldCheck,
  Calendar,
  History,
} from 'lucide-react';

interface ServiceUserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServiceUserGuideModal: React.FC<ServiceUserGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'workspace' | 'todo' | 'cti' | 'collaboration'>('workspace');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <span>ZMS CS Helper 서비스 이용 가이드</span>
                <span className="text-[10px] bg-blue-100 text-blue-700 font-extrabold px-2 py-0.5 rounded-full border border-blue-200">
                  필독 권장
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                로그인 후 업무 시작 전 꼭 읽어주세요! 실무 상담 접수부터 CTI/AI 및 TODO 관리 완벽 가이드
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 text-xs font-bold overflow-x-auto custom-scroll">
          <button
            type="button"
            onClick={() => setActiveTab('workspace')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'workspace'
                ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>1. 상담 등록 & 워크스페이스</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('todo')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'todo'
                ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>2. 업무 & TODO 관제</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cti')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'cti'
                ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            <span>3. CTI 수집 & Gemini AI 분석</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('collaboration')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'collaboration'
                ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Kanban className="w-4 h-4" />
            <span>4. 캘린더, 칸반 & 실시간 협업</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto custom-scroll flex-1 text-xs text-slate-700 leading-relaxed bg-slate-50/30">
          {/* TAB 1: WORKSPACE */}
          {activeTab === 'workspace' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                <Zap className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-blue-900 text-sm">📞 전화 상담 접수 & 처리 순서 (Standard Workflow)</h4>
                  <p className="text-blue-700 mt-1">
                    고객 전화 수신 시 입력부터 저장, 처리 단계 관리, 캘린더/칸반 리마인드까지의 정석적인 흐름입니다.
                  </p>
                </div>
              </div>

              {/* Step-by-step cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-2xs relative">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-[11px] flex items-center justify-center">
                    1
                  </div>
                  <h5 className="font-bold text-slate-900 text-xs">수신 번호 / 차량번호 입력</h5>
                  <p className="text-slate-600 text-[11px]">
                    전화가 오면 수신 연락처나 차량번호를 입력합니다. 하나만 입력해도 <strong>과거 고객 상담 이력이 100% 자동 매칭</strong>됩니다.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-2xs relative">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-[11px] flex items-center justify-center">
                    2
                  </div>
                  <h5 className="font-bold text-slate-900 text-xs">상담 내용 작성 & 신규 저장</h5>
                  <p className="text-slate-600 text-[11px]">
                    문의 유형(주차문의, 차량변경, 결제/환불 등)을 선택하고 통화 내용을 상세히 기재한 뒤 <strong className="text-blue-600">[새 상담내역 저장]</strong>을 클릭합니다.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-2xs relative">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-[11px] flex items-center justify-center">
                    3
                  </div>
                  <h5 className="font-bold text-slate-900 text-xs">프로세스 단계 수정 & 리마인드</h5>
                  <p className="text-slate-600 text-[11px]">
                    상단 스텝퍼를 통해 진행 상태(공유자부재, 결제메시지전송, 부서확인중 등)를 변경하며, 칸반/캘린더에서 지속 처리합니다.
                  </p>
                </div>
              </div>

              {/* Detail Info Boxes */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
                <h5 className="font-bold text-slate-800 text-xs flex items-center gap-2 border-b pb-2 border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  문의 유형별 프로세스 스텝퍼 안내
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <strong className="text-blue-800 font-bold block mb-1">🅿️ 주차 문의 (4단계)</strong>
                    <span className="text-slate-600">
                      접수 ➔ <span className="text-amber-700 font-bold">공유자부재</span> ➔ <span className="text-purple-700 font-bold">결제메시지전송</span> ➔ <span className="text-emerald-700 font-bold">결제완료</span>
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <strong className="text-indigo-800 font-bold block mb-1">🚗 차량 변경 (3단계)</strong>
                    <span className="text-slate-600">
                      접수 ➔ <span className="text-blue-700 font-bold">유관부서/공급사 확인중</span> ➔ <span className="text-emerald-700 font-bold">처리완료</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TODO */}
          {activeTab === 'todo' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <CheckSquare className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">📋 업무 & TODO 관제 기능의 올바른 활용법</h4>
                  <p className="text-amber-800 mt-1">
                    TODO 관제는 결제/환불/차량변경 같은 무거운 상담 본체 대신, <strong>알림 메모장 및 이관 미션</strong>을 관리하는 공간입니다.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-red-200 rounded-xl p-4 space-y-2 shadow-2xs">
                  <h5 className="font-bold text-red-800 flex items-center gap-1.5 text-xs">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    ❌ 무거운 상담 건 (여기 적지 마세요)
                  </h5>
                  <p className="text-slate-600 text-[11px]">
                    고객 주차 결제, 환불 처리, 차량 번호 변경 등 고객과의 직접 상담 이력은 <strong>[상담 등록 & 워크스페이스]</strong>에 기록하셔야 전체 상담사 이력 공유 및 DB 자동 매칭이 지원됩니다.
                  </p>
                </div>

                <div className="bg-white border border-emerald-200 rounded-xl p-4 space-y-2 shadow-2xs">
                  <h5 className="font-bold text-emerald-800 flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ⭕ 메모장 & 리마인더 알림 (권장 활용)
                  </h5>
                  <p className="text-slate-600 text-[11px]">
                    "15시에 공유자 확인 전화 걸기", "내일 오전까지 서류 전송 확인" 등 <strong>잊지 말아야 할 1클릭 팝업 알림 메모</strong>나 타 상담사에게 인수인계할 간단 업무를 적어두는 용도입니다.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
                <h5 className="font-bold text-slate-800 text-xs flex items-center gap-2 border-b pb-2 border-slate-100">
                  <History className="w-4 h-4 text-amber-600" />
                  TODO 관제 핵심 3대 기능
                </h5>
                <ul className="space-y-2 text-[11px] text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded text-[10px] shrink-0 mt-0.5">상단 4대 KPI</span>
                    <span>내 담당 미완료, 내가 타 상담사에 전달한 건, 오늘 마감/알림/지연건, 사내 전체 미처리건 통계 제공.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded text-[10px] shrink-0 mt-0.5">📜 이관 히스토리</span>
                    <span><code className="text-amber-800 font-bold">📌 작성: 이현우 ➔ 담당: 이동헌</code> 이관 배지 또는 히스토리 버튼 클릭 시 전달 타임라인 시각화 모달 제공.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded text-[10px] shrink-0 mt-0.5">셀프 이관 방지</span>
                    <span>본인에서 본인으로의 무의미한 동일 상담사 이관은 차단되며 경고 팝업이 표시됩니다.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: CTI & GEMINI */}
          {activeTab === 'cti' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Highlight Warning Box */}
              <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-4 flex gap-3 shadow-2xs">
                <Sparkles className="w-6 h-6 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-purple-900 text-sm flex items-center gap-2">
                    <span>🎙️ CTI 수집 & GEMINI AI 분석 연동 가이드</span>
                    <span className="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">필수 사전 설정</span>
                  </h4>
                  <p className="text-purple-800 mt-1 font-medium text-[11px]">
                    CTI 녹취 수집과 AI 대본 요약을 사용하려면 아래 <strong>2가지 사전 설정이 필수</strong>입니다!
                  </p>
                </div>
              </div>

              {/* 2 Mandatory Requirements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border-2 border-amber-300 rounded-xl p-4 space-y-2 shadow-2xs relative">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <Key className="w-4 h-4 text-amber-600" />
                    <span>필수 1. CTI 계정 로그인</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    상단 우측 프로필/계정 설정 팝업에서 <strong>사내 CTI 아이디와 비밀번호를 먼저 로그인</strong>해 주셔야 시스템이 서버 세션을 유지하고 녹취 파일 수집 파이프라인을 작동시킵니다.
                  </p>
                </div>

                <div className="bg-white border-2 border-blue-300 rounded-xl p-4 space-y-2 shadow-2xs relative">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>필수 2. Gemini API 키 입력</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Google AI Studio에서 발급받은 <strong>Gemini API Key를 시스템 설정에 넣어야</strong> 초고속 2초 STT 통화 대본 변환 및 4단계 스토리 핵심 요약 기능이 정상 작동합니다.
                  </p>
                </div>
              </div>

              {/* Features summary */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
                <h5 className="font-bold text-slate-800 text-xs flex items-center gap-2 border-b pb-2 border-slate-100">
                  <PhoneCall className="w-4 h-4 text-purple-600" />
                  CTI / AI 주요 분석 기능
                </h5>
                <ul className="space-y-2 text-[11px] text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-purple-700 shrink-0">1. 초고속 STT:</span>
                    <span>통화 음성 MP3를 2초 만에 분석하여 대화 주체(상담사/고객)별 실시간 대본 생성.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-purple-700 shrink-0">2. 4단계 스토리 요약:</span>
                    <span>통화 핵심 내용을 4단계 요약본으로 추출하며, 버튼 1클릭으로 상담 메모에 반영 가능.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-purple-700 shrink-0">3. 감정 분석 & 내선 배지:</span>
                    <span>고객의 감정 상태(긍정/중립/부정)를 감지하고, 내선번호와 상담사 프로필을 자동 비교 배징합니다.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 4: COLLABORATION */}
          {activeTab === 'collaboration' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3">
                <Users className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-900 text-sm">📅 캘린더, 칸반보드 & 사내 실시간 다방향 협업</h4>
                  <p className="text-emerald-800 mt-1">
                    여러 상담사가 동시 접속하더라도 데이터가 실시간 동기화되고 편집 충돌을 방지합니다.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-2xs">
                  <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Kanban className="w-4 h-4 text-amber-500" />
                    칸반 파이프라인 & 아코디언
                  </h5>
                  <p className="text-slate-600 text-[11px]">
                    접수 / 해결중 / 완료 3개 메인 컬럼과 세부 프로세스 단계(공유자부재, 결제메시지, 부서확인 등)별 아코디언 패널로 한눈에 관제합니다.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-2xs">
                  <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    캘린더 관제 & 마감 일시
                  </h5>
                  <p className="text-slate-600 text-[11px]">
                    마감일자(`due_date`)와 1클릭 미리 알림(`reminder_datetime`)이 통합 표출되어 당일 마감건 및 지연건을 손쉽게 추적합니다.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-2xs">
                <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-500" />
                  실시간 다방향 동기화 & 편집 소프트 락 (Soft Lock)
                </h5>
                <p className="text-slate-600 text-[11px]">
                  Supabase Realtime 웹소켓 연동으로 500ms 이내에 사내 모든 상담원의 화면에 데이터가 동기화되며, 타 상담사가 특정 상담건을 편집 중인 경우 <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">🟡 타 상담사 편집 중</span> 펄스 알림 배지가 노출되어 동시 중복 저장을 막아줍니다.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
            💡 이용 중 문의사항은 시스템 관리자(어드민)에게 언제든 요청해 주세요.
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
          >
            가이드 확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
