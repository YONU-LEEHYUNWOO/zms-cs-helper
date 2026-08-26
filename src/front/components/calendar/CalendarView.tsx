/**
 * ZMS CS Helper - 상담 일정 및 마감 캘린더 뷰 컴포넌트
 * 
 * [수리 & UX 개선]
 * 1. 동일 상담건 이중 렌더링 제거 (주차 희망일 hope_date 기준 단 1회 노출).
 * 2. 리마인더/후속 조치 작업(AgentTask) 클릭 시 리마인더 상세 조치 팝업 모달 구현.
 * 
 * [주의] 기존 디자인 100% 유지
 */

import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  X,
  Edit3,
  Car,
  Phone,
  Building,
  FileText,
  Filter,
  CheckCircle,
  BellRing,
  CheckSquare,
} from 'lucide-react';
import { Consultation, AgentTask, InternalAgent, Customer } from '../../../backend/types';
import { getSubStatusBadgeStyle, formatSubStatus, getInquiryTypeBadgeStyle } from '../../../lib/utils/consultationArchive';
import { maskTempCarNumber, maskTempPhoneNumber } from '../../../lib/utils/normalize';

interface CalendarViewProps {
  consultations: Consultation[];
  tasks: AgentTask[];
  agents?: InternalAgent[];
  customers?: Customer[];
  currentAgentName: string;
  onSelectConsultation?: (consId: string) => void;
  onNavigateToWorkspace?: () => void;
}

// sub_status 값 → 사람이 읽기 쉬운 레이블 및 색상 변환
const SUB_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  '접수': { label: '접수', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  '공유자_부재': { label: '공유자 부재', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  '결제메시지_전송': { label: '결제 메시지 전송', color: 'bg-amber-100 text-amber-900 border-amber-300 font-bold' },
  '결제완료': { label: '결제완료/처리완료', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  '부서확인중': { label: '부서 확인 중', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  '처리완료': { label: '결제완료/처리완료', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
};

export const CalendarView: React.FC<CalendarViewProps> = ({
  consultations,
  tasks,
  agents = [],
  customers = [],
  currentAgentName,
  onSelectConsultation,
  onNavigateToWorkspace,
}) => {
  const [filterAgent, setFilterAgent] = useState<string>(currentAgentName || '');
  const [calendarMode, setCalendarMode] = useState<'hope' | 'start' | 'all'>('hope');
  const [selectedCons, setSelectedCons] = useState<Consultation | null>(null);
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const [selectedDayInfo, setSelectedDayInfo] = useState<{
    dateStr: string;
    consultations: Consultation[];
    tasks: AgentTask[];
  } | null>(null);
  const [localTasks, setLocalTasks] = useState<AgentTask[]>(tasks);
  const [currentDate, setCurrentDate] = useState(new Date());

  React.useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const paddingDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const filteredConsultations = consultations.filter((c) => {
    if (c.is_archived === true) return false;
    return filterAgent ? c.agent_name === filterAgent : true;
  });

  const filteredTasks = localTasks.filter((t) =>
    filterAgent ? t.agent_name === filterAgent : true
  );

  const registeredAgentNames = new Set(agents.map((a) => a.agent_name));

  const handleOpenDetail = (cons: Consultation) => {
    setSelectedCons(cons);
  };

  const handleOpenTaskDetail = (task: AgentTask) => {
    setSelectedTask(task);
  };

  const handleToggleTaskCompleted = (taskId: string) => {
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, is_completed: !t.is_completed } : t))
    );
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, is_completed: !prev.is_completed } : null));
    }
  };

  const handleGoToWorkspace = (consId: string) => {
    if (onSelectConsultation) {
      onSelectConsultation(consId);
    }
    if (onNavigateToWorkspace) {
      onNavigateToWorkspace();
    }
    setSelectedCons(null);
    setSelectedTask(null);
  };

  const getCustomerForCons = (cons: Consultation) => {
    return (
      customers.find((c) => c.id === cons.customer_id) || {
        phone_number: cons.phone_number || '',
        car_number: cons.car_number || '',
      }
    );
  };

  const getResolvedStatus = (cons: Consultation): string => {
    const sub = (cons.sub_status || '').trim();
    if (sub) {
      const cleanSub = sub.replace(/[^0-9a-zA-Z가-힣]/g, '').replace(/메세지/g, '메시지');
      if (cleanSub === '결제완료' || cleanSub === '처리완료') return '완료';
      if (
        cleanSub === '공유자부재' ||
        cleanSub === '결제메시지전송' ||
        cleanSub === '부서확인중' ||
        cleanSub === '해결중'
      )
        return '해결중';
      if (cleanSub === '접수' || cleanSub === '문의접수') return '접수';
    }
    return cons.status || '접수';
  };

  const getBadgeStyle = (cons: Consultation) => {
    const resolved = getResolvedStatus(cons);
    switch (resolved) {
      case '해결중':
        return 'bg-amber-50 text-amber-950 border-amber-200 hover:border-amber-400';
      case '공유자 연락 중':
        return 'bg-orange-50 text-orange-950 border-orange-200 hover:border-orange-400';
      case '유선 부서 확인 중':
        return 'bg-purple-50 text-purple-950 border-purple-200 hover:border-purple-400';
      case '완료':
        return 'bg-emerald-50 text-emerald-950 border-emerald-200 hover:border-emerald-400';
      default:
        return 'bg-blue-50 text-blue-950 border-blue-200 hover:border-blue-400';
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6 font-sans">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <CalendarIcon className="w-5 h-5" />
            </div>
            상담 일정 및 리마인더 관제 캘린더
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            주차 희망일(상담건) 및 리마인더 마감 일정을 시각적으로 구분하여 한눈에 관제합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* 📅 일정 정렬 기준 세그먼트 버튼 */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-inner mr-2">
            <button
              type="button"
              onClick={() => setCalendarMode('hope')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${calendarMode === 'hope'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
              title="고객 피드백이나 상담이 예정된 희망일 기준으로 정렬합니다."
            >
              📅 상담 희망일
            </button>
            <button
              type="button"
              onClick={() => setCalendarMode('start')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${calendarMode === 'start'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
              title="실제 주차장 입차가 시작되는 시작일 기준으로 정렬합니다."
            >
              🚗 주차 시작일
            </button>
            <button
              type="button"
              onClick={() => setCalendarMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${calendarMode === 'all'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
              title="희망일과 시작일 모두를 한 캘린더에 병합 노출합니다 (이중 노출 주의)."
            >
              🔄 전체(중복포함)
            </button>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-xs">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-slate-500 font-medium">상담원 필터:</span>
            <select
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="">전체 상담원 보기</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.agent_name}>
                  {ag.agent_name} 상담사
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 border border-slate-200">
            <button type="button" onClick={handlePrevMonth} className="p-1.5 hover:bg-white rounded text-slate-600 transition-all cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold px-3 text-slate-900">{currentYear}년 {currentMonth + 1}월</span>
            <button type="button" onClick={handleNextMonth} className="p-1.5 hover:bg-white rounded text-slate-600 transition-all cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center py-3 text-xs font-bold text-slate-600">
          <span className="text-red-500">일요일</span>
          <span>월요일</span>
          <span>화요일</span>
          <span>수요일</span>
          <span>목요일</span>
          <span>금요일</span>
          <span className="text-blue-600">토요일</span>
        </div>

        <div className="grid grid-cols-7 auto-rows-fr gap-px bg-slate-200 min-h-[600px]">
          {paddingDays.map((pad) => (
            <div key={`pad-${pad}`} className="bg-slate-50/50 p-2 min-h-[100px]" />
          ))}
          {days.map((day) => {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, day).toDateString();
            const rawMatchedCons = filteredConsultations.filter((c) => {
              if (calendarMode === 'hope') {
                // 📅 상담 희망일 모드: 오직 희망일(hope_date)이 당일 날짜와 일치하는 건만 노출
                return c.hope_date === dateStr;
              } else if (calendarMode === 'start') {
                // 🚗 주차 시작일 모드: 오직 희망 주차 시작일(parking_start_date)이 당일 날짜와 일치하는 건만 노출
                return c.parking_start_date === dateStr;
              } else {
                // 🔄 전체 모드: 희망일 또는 시작일이 일치하는 건 노출
                return c.hope_date === dateStr || c.parking_start_date === dateStr;
              }
            });
            const matchedCons = rawMatchedCons.filter(
              (c, index, self) => index === self.findIndex((t) => t.id === c.id)
            );

            const matchedTasks = filteredTasks.filter((t) => Boolean(t.due_date && t.due_date.startsWith(dateStr)));

            // 상태별 건수 요약
            const stats = {
              접수: matchedCons.filter(c => getResolvedStatus(c) === '접수').length,
              해결중: matchedCons.filter(c => getResolvedStatus(c) === '해결중').length,
              완료: matchedCons.filter(c => getResolvedStatus(c) === '완료').length,
              리마인더: matchedTasks.filter(t => !t.is_completed).length,
            };

            const hasData = matchedCons.length > 0 || matchedTasks.length > 0;

            return (
              <div
                key={day}
                onClick={() => {
                  if (hasData) {
                    setSelectedDayInfo({
                      dateStr,
                      consultations: matchedCons,
                      tasks: matchedTasks,
                    });
                  }
                }}
                className={`bg-white p-2 flex flex-col min-h-[110px] max-h-[140px] transition-colors relative select-none ${hasData ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50/50'
                  } ${isToday ? 'bg-blue-50/20 ring-2 ring-blue-500 ring-inset' : ''
                  }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span
                    className={`text-xs font-bold font-mono ${isToday
                        ? 'w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs'
                        : 'text-slate-700'
                      }`}
                  >
                    {day}
                  </span>
                  {isToday && (
                    <span className="text-[9px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">
                      오늘
                    </span>
                  )}
                </div>

                {/* 📊 접수 / 해결중 / 완료 및 리마인더 요약 배지 */}
                <div className="flex-1 flex flex-col justify-end gap-1 mt-1 pb-1">
                  {stats.접수 > 0 && (
                    <div className="flex items-center justify-between text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                      <span>🔵 접수</span>
                      <span>{stats.접수}건</span>
                    </div>
                  )}
                  {stats.해결중 > 0 && (
                    <div className="flex items-center justify-between text-[10px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                      <span>🟡 해결중</span>
                      <span>{stats.해결중}건</span>
                    </div>
                  )}
                  {stats.완료 > 0 && (
                    <div className="flex items-center justify-between text-[10px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                      <span>🟢 완료</span>
                      <span>{stats.완료}건</span>
                    </div>
                  )}
                  {stats.리마인더 > 0 && (
                    <div className="flex items-center justify-between text-[10px] font-bold bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-200">
                      <span>⏰ 리마인더</span>
                      <span>{stats.리마인더}건</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 1. Consultation Detail Modal */}
      {selectedCons && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setSelectedCons(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-in fade-in duration-150" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-xs ${getResolvedStatus(selectedCons) === '완료'
                      ? 'bg-emerald-600'
                      : getResolvedStatus(selectedCons) === '해결중'
                        ? 'bg-amber-500'
                        : 'bg-blue-600'
                    }`}
                >
                  {getResolvedStatus(selectedCons)}
                </span>

                {selectedCons.sub_status && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getSubStatusBadgeStyle(selectedCons.sub_status)}`}>
                    ⚡ {formatSubStatus(selectedCons.sub_status)}
                  </span>
                )}

                <span className="text-xs font-semibold text-slate-500">
                  {selectedCons.inquiry_type || '일반문의'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCons(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400">연락처</p>
                    <p className="font-bold font-mono">
                      {maskTempPhoneNumber(selectedCons.phone_number || getCustomerForCons(selectedCons).phone_number, '미입력', true)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-700">
                  <Car className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400">차량번호</p>
                    <p className="font-bold font-mono uppercase">
                      {maskTempCarNumber(selectedCons.car_number || getCustomerForCons(selectedCons).car_number, '미입력')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-700 mt-1">
                  <Building className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400">주차 희망 장소</p>
                    <p className="font-bold">{selectedCons.parking_name || '주차장 미지정'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-700 mt-1">
                  <User className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400">담당 상담사</p>
                    <p className="font-bold flex items-center gap-1">
                      {selectedCons.agent_name || '미지정'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  상담 요약 및 접수 내용
                </label>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 leading-relaxed min-h-[80px]">
                  {selectedCons.summary || '등록된 상담 요약 내역이 없습니다.'}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedCons(null)}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => handleGoToWorkspace(selectedCons.id)}
                className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" />
                워크스페이스에서 편집하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Dedicated Reminder Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setSelectedTask(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-200 space-y-4 animate-in fade-in duration-150" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                <BellRing className="w-5 h-5 text-red-600 animate-bounce" />
                리마인더 / 후속 조치 상세
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-xl space-y-1.5">
                <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">
                  마감 예정 시간: {selectedTask.due_date ? selectedTask.due_date.replace('T', ' ').slice(0, 16) : '마감일 미지정'}
                </span>
                <p className="text-sm font-bold text-slate-900 pt-1">{selectedTask.task_title}</p>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-500 font-semibold">담당 상담사:</span>
                <span className="font-bold text-slate-900">👤 {selectedTask.agent_name} 상담사</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-500 font-semibold">조치 완료 상태:</span>
                <button
                  type="button"
                  onClick={() => handleToggleTaskCompleted(selectedTask.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${selectedTask.is_completed
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  {selectedTask.is_completed ? '조치 완료됨' : '미완료 (클릭하여 완료)'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-semibold text-xs hover:bg-slate-50 cursor-pointer"
              >
                닫기
              </button>
              {selectedTask.consultation_id && (
                <button
                  type="button"
                  onClick={() => handleGoToWorkspace(selectedTask.consultation_id!)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  연관 상담 워크스페이스 이동
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Day Detail Expand Modal */}
      {selectedDayInfo && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 flex items-center justify-center p-4"
          onClick={() => setSelectedDayInfo(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col animate-in fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span>📅 {selectedDayInfo.dateStr}</span>
                  <span className="text-xs font-semibold text-slate-500">일별 상세 상담 및 리마인더 내역</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">이름 또는 차량번호를 눌러 상세 카드 보기나 워크스페이스 연동이 가능합니다.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayInfo(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll space-y-4 pr-1 py-1">
              {/* 상담 내역 영역 */}
              {selectedDayInfo.consultations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 pl-1">
                    <span className="w-1.5 h-3 bg-indigo-600 rounded-full"></span>
                    상담 내역 ({selectedDayInfo.consultations.length}건)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedDayInfo.consultations.map((c) => {
                      const isUnlisted = c.agent_name && !registeredAgentNames.has(c.agent_name);
                      const cust = getCustomerForCons(c);
                      const displayPhone = maskTempPhoneNumber(cust.phone_number || c.phone_number, '', true);
                      const displayCar = maskTempCarNumber(cust.car_number || c.car_number, '');

                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedCons(c);
                          }}
                          className={`p-3.5 rounded-xl border text-xs font-semibold leading-relaxed cursor-pointer transition-all shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${getBadgeStyle(c)}`}
                        >
                          <div className="space-y-2">
                            <p className="font-extrabold text-slate-900 line-clamp-2 leading-normal">
                              {c.summary || '등록된 메모 내용이 없습니다.'}
                            </p>

                            <div className="flex flex-wrap items-center gap-1">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold border shrink-0 ${getInquiryTypeBadgeStyle(c.inquiry_type)
                                }`}>
                                📂 {c.inquiry_type || '주차 문의'}
                              </span>

                              {c.sub_status ? (
                                <span className={`px-1.5 py-0.5 rounded text-[9px] border w-fit ${getSubStatusBadgeStyle(c.sub_status)}`}>
                                  ⚡ {formatSubStatus(c.sub_status)}
                                </span>
                              ) : (
                                <span className="truncate text-slate-500 font-medium text-[9px] bg-white/60 px-1 py-0.5 rounded w-fit">
                                  [{c.status}]
                                </span>
                              )}

                              {c.parking_name && (
                                <span className="truncate text-slate-600 font-medium text-[9px] bg-white/60 px-1 py-0.5 rounded">
                                  {c.parking_name}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-700 mt-1 pt-1.5 border-t border-slate-100 flex-wrap">
                              {displayPhone && (
                                <span className="bg-white/90 px-1.5 py-0.5 rounded border border-slate-200">
                                  📞 {displayPhone}
                                </span>
                              )}
                              {displayCar && (
                                <span className="bg-white/90 px-1.5 py-0.5 rounded border border-slate-200 uppercase font-bold text-slate-950">
                                  🚗 {displayCar}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1.5 mt-1 border-t border-dashed border-slate-200">
                              <span className="flex items-center gap-1 font-bold">
                                👤 {c.agent_name || '미지정'}
                              </span>
                              {isUnlisted && (
                                <span className="text-[9px] text-amber-700 font-bold bg-amber-100 px-1.5 py-0.2 rounded">
                                  삭제됨
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 리마인더 영역 */}
              {selectedDayInfo.tasks.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 pl-1">
                    <span className="w-1.5 h-3 bg-red-600 rounded-full animate-pulse"></span>
                    리마인더 / 후속 조치 ({selectedDayInfo.tasks.length}건)
                  </h4>
                  <div className="space-y-2">
                    {selectedDayInfo.tasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-3 cursor-pointer transition-all shadow-2xs hover:shadow-xs border ${t.is_completed
                            ? 'bg-slate-50 text-slate-400 border-slate-200 line-through'
                            : 'bg-red-50 text-red-900 border-red-200 hover:border-red-300'
                          }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <BellRing className={`w-4 h-4 shrink-0 ${t.is_completed ? 'text-slate-400' : 'text-red-600'}`} />
                          <span className="truncate">{t.task_title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono shrink-0 px-2 py-0.5 bg-white/90 rounded-md border">
                            ⏰ {t.due_date ? t.due_date.replace('T', ' ').slice(11, 16) : '미지정'}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500 shrink-0">
                            👤 {t.agent_name}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedDayInfo(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
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
