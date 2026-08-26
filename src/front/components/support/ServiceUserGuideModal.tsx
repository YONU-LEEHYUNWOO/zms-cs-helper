/**
 * ZMS CS Helper - 사내 서비스 사용 가이드 & 이용 매뉴얼 모달 (ServiceUserGuideModal)
 * 
 * [주요 기능]
 * - 사이드바에서 1클릭으로 실행되는 사용자 친화적 가이드 모달
 * - 4대 주제 탭: 1) 상담 등록/워크스페이스, 2) CTI 녹취/Gemini AI, 3) 관제 보드/칸반, 4) 실시간 협업/소프트락
 * - Rule 8 준수: 백드롭 딤 클릭 닫기 지원
 */

import React, { useState } from 'react';
import {
  X, BookOpen, LayoutDashboard, PhoneCall, Kanban, Users, CheckCircle2,
  Sparkles, ShieldCheck, Zap, ArrowRight, HelpCircle, AlertCircle, Clock, Lock
} from 'lucide-react';

interface ServiceUserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServiceUserGuideModal: React.FC<ServiceUserGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'workspace' | 'cti' | 'kanban' | 'collaboration'>('workspace');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">ZMS CS Helper 서비스 이용 가이드</h2>
              <p className="text-xs text-slate-500 font-medium">
                사내 다중 상담원 통합 관제 및 CTI/AI 핵심 사용 지침 매뉴얼입니다.
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
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>1. 상담 등록 & 워크스페이스</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cti')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'cti'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            <span>2. CTI 수집 & Gemini AI 분석</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kanban')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'kanban'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Kanban className="w-4 h-4" />
            <span>3. 관제 보드 & 아코디언</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('collaboration')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'collaboration'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>4. 다방면 공유 & 소프트 락</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto custom-scroll flex-1 text-xs text-slate-700 leading-relaxed bg-white">
          {activeTab === 'workspace' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                <Zap className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-blue-900 text-sm">상담 등록 및 워크스페이스 기초</h4>
                  <p className="text-blue-700 mt-1">
                    신규 주차 문의/연장/차량 변경 건을 접수하고, 고객 정보 자동 연동 및 이력을 확인합니다.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <h5 className="font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    1. 고객 정보 입력 & 자동 매칭 규칙
                  </h5>
                  <p className="text-slate-600">
                    - 차량번호 또는 연락처 중 하나만 입력해도 과거 고객 상담 이력이 <strong>자동으로 100% 매칭</strong>되어 연결됩니다.<br />
                    - 연락처나 차량번호가 없는 미등록 고객의 경우에도 식별 오류 없이 안전하게 상담 접수 및 저장이 가능합니다.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <h5 className="font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    2. 문의 유형별 전용 프로세스 스텝퍼
                  </h5>
                  <p className="text-slate-600">
                    - <strong>주차 문의</strong>: 4단계 (접수 ➔ 공유자부재 ➔ 결제메시지 ➔ 결제완료)<br />
                    - <strong>차량 변경</strong>: 3단계 (접수 ➔ 유관부서/공급사 확인중 ➔ 처리완료)<br />
                    - 단계 변경 시 상단 세부 상태가 무결하게 연동됩니다.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 space-y-2 md:col-span-2">
                  <h5 className="font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    3. 과거 전체 상담 이력 수직 타임라인 (<code className="text-blue-600">📜 버튼</code>)
                  </h5>
                  <p className="text-slate-600">
                    상담 폼의 <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">📜 과거 상담 이력</span> 버튼을 누르면, 이 고객이 과거에 어떤 상담 직원과 무슨 내용으로 통화를 나눴는지 역연대순 수직 타임라인으로 한눈에 추적할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cti' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 flex gap-3">
                <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-purple-900 text-sm">사내 CTI 녹취 자동 수집 & Gemini AI 분석</h4>
                  <p className="text-purple-700 mt-1">
                    사내 CTI 서버(<code className="font-mono bg-purple-100 px-1 py-0.5 rounded">http://202.30.232.240</code>)와 100% 자동 연동하여 통화 오디오 추출 및 AI 요약을 실행합니다.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="border border-slate-200 rounded-xl p-4 flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800">CTI 자동 로그인 & 세션 획득</h5>
                    <p className="text-slate-600 mt-1">
                      상담사 계정 설정 팝업에서 CTI 아이디와 비밀번호를 설정해 두면, 시스템이 자동으로 로그인 쿠키를 유지하여 6단계 파이프라인으로 통화 녹취를 크롤링합니다.
                    </p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800">Gemini 3.5 Flash 초고속 2초 STT & 4단계 스토리 요약</h5>
                    <p className="text-slate-600 mt-1">
                      오디오 MP3 파일을 초고속으로 파싱하여 핵심 4단계 스토리 요약, 고객 감정 상태(긍정/중립/부정), 그리고 전체 대화 STT 대본을 생성합니다. 클릭 한 번으로 상담 메모에 자동 적용됩니다.
                    </p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800">내선번호 ↔ 상담사 1:1 자동 매칭 배지</h5>
                    <p className="text-slate-600 mt-1">
                      녹취 목록 및 상세 화면에서 내선번호(예: <code className="bg-slate-100 px-1">7997</code>)가 DB 상담원의 내선과 자동 비교되어 <span className="bg-blue-50 text-blue-700 border border-blue-100 font-bold px-2 py-0.5 rounded">👤 해당 상담사</span> 배지로 시각화됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'kanban' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
                <Kanban className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">칸반 파이프라인 & 세부 단계별 아코디언</h4>
                  <p className="text-amber-700 mt-1">
                    상담 처리 단계별로 카드를 한눈에 관제하고 담당 상담사를 실시간 변경합니다.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <h5 className="font-bold text-slate-800">📌 세부 단계별 아코디언 패널</h5>
                  <p className="text-slate-600">
                    접수 / 해결중 / 완료 3대 메인 컬럼 내부에 <span className="text-amber-700 font-bold">공유자 부재</span>, <span className="text-purple-700 font-bold">결제메시지 전송</span>, <span className="text-blue-700 font-bold">부서 확인 중</span> 등의 세부 그룹별로 카드가 깔끔하게 분류 표출됩니다.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <h5 className="font-bold text-slate-800">🔄 1클릭 담당자 변경 & 인수인계</h5>
                  <p className="text-slate-600">
                    상담 카드의 담당자 셀렉트 박스를 클릭하면 다른 상담원으로 업무 주체를 즉시 이관할 수 있으며, 해당 상담원의 화면에 1초 만에 알림 뱃지가 표출됩니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'collaboration' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3">
                <Users className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-900 text-sm">사내 다방면 공유 & 실시간 소프트 락 (Soft Lock)</h4>
                  <p className="text-emerald-700 mt-1">
                    여러 상담원이 동시에 작업하더라도 데이터가 즉시 다방향 동기화되고 중복 편집 충돌을 방지합니다.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-amber-500" />
                    실시간 편집 소프트 락 (Soft Lock)
                  </h5>
                  <p className="text-slate-600">
                    타 상담원이 이미 해당 상담건을 작성/수정 중인 경우, 폼 상단에 <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">🟡 해당 상담사 편집 중</span> 펄스 알림 배지가 노출되며 저장 시 사전 경고 안내를 받습니다.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-500" />
                    전 사내 상담원 명단 & 내선 조회
                  </h5>
                  <p className="text-slate-600">
                    등록된 사내 모든 상담사 계정 정보 및 CTI 내선번호가 사내 전체 공유되어, 어드민 패널 및 사내 명단 탭에서 전원의 프로필을 다방면으로 조회할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            💡 추가 문의사항이나 개선 제안은 시스템 관리자(어드민)에게 전달해 주세요.
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
