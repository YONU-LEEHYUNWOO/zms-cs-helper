/**
 * ZMS CS Helper - 칸반 파이프라인 보드 컴포넌트
 *
 * [수정 내역]
 * - 칸반 컬럼을 대분류 status 기준 3컬럼으로 정리 (접수중 / 해결중 / 완료)
 * - 카드에 sub_status(세부 프로세스 단계) 배지 추가 (결제 메시지 전송 등 직관적 표시)
 * - 칸반 내 검색: 연락처(차주/공유자 포함), 차량번호, 세부 프로세스 단계 모두 매칭
 */

import React, { useState } from 'react';
import {
  Kanban as KanbanIcon,
  Search,
  Building,
  Filter,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
} from 'lucide-react';
import { Consultation, ConsultationStatus, Customer, InternalAgent } from '../../../backend/types';
import { getSubStatusBadgeStyle, formatSubStatus, getInquiryTypeBadgeStyle } from '../../../lib/utils/consultationArchive';
import { maskTempCarNumber, maskTempPhoneNumber } from '../../../lib/utils/normalize';

interface KanbanBoardViewProps {
  consultations: Consultation[];
  customers: Customer[];
  agents: InternalAgent[];
  currentAgentName: string;
  onSelectConsultation?: (consId: string) => void;
  onNavigateToWorkspace?: () => void;
  onUpdateStatus?: (consId: string, newStatus: ConsultationStatus) => void;
}

// ────────────────────────────────────────────────────
// 📋 칸반 컬럼 정의: 대분류 status 기준 3단계
// ────────────────────────────────────────────────────
const KANBAN_COLUMNS: { status: ConsultationStatus; label: string; emoji: string; headerColor: string; badgeBg: string }[] = [
  {
    status: '접수',
    label: '신규 접수',
    emoji: '📥',
    headerColor: 'border-blue-500 text-blue-700',
    badgeBg: 'bg-blue-100 text-blue-800',
  },
  {
    status: '해결중',
    label: '처리 진행중',
    emoji: '⚙️',
    headerColor: 'border-amber-500 text-amber-700',
    badgeBg: 'bg-amber-100 text-amber-800',
  },
  {
    status: '완료',
    label: '처리 완료',
    emoji: '✅',
    headerColor: 'border-emerald-500 text-emerald-700',
    badgeBg: 'bg-emerald-100 text-emerald-800',
  },
];

// sub_status 값 → 사람이 읽기 쉬운 레이블 및 색상 변환
const SUB_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  '접수':             { label: '접수',             color: 'bg-blue-100 text-blue-700 border-blue-200' },
  '공유자_부재':       { label: '공유자 부재',       color: 'bg-orange-100 text-orange-700 border-orange-200' },
  '결제메시지_전송':   { label: '결제 메시지 전송', color: 'bg-amber-100 text-amber-800 border-amber-300 font-black' },
  '결제완료':          { label: '결제완료/처리완료', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  '부서확인중':        { label: '부서 확인 중',      color: 'bg-purple-100 text-purple-700 border-purple-200' },
  '처리완료':          { label: '결제완료/처리완료', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

// ────────────────────────────────────────────────────
// ⚙️ 상담건의 status / sub_status 복합 분류 함수
// ────────────────────────────────────────────────────
function getKanbanColumnKey(c: Consultation): ConsultationStatus {
  const sub = (c.sub_status || '').trim();
  const status = (c.status || '').trim();

  // 1. sub_status (세부 단계) 최우선 매칭 (공백/스펠링 정규화)
  if (sub) {
    const cleanSub = sub.replace(/[^0-9a-zA-Z가-힣]/g, '').replace(/메세지/g, '메시지');

    if (cleanSub === '결제완료' || cleanSub === '처리완료') {
      return '완료';
    }
    if (
      cleanSub === '공유자부재' ||
      cleanSub === '결제메시지전송' ||
      cleanSub === '부서확인중' ||
      cleanSub === '해결중'
    ) {
      return '해결중';
    }
    if (cleanSub === '접수' || cleanSub === '문의접수') {
      return '접수';
    }
  }

  // 2. sub_status 미설정 건: DB status 기준 폴백
  if (status === '완료') {
    return '완료';
  }
  if (status === '접수') {
    return '접수';
  }

  return '해결중';
}

export const KanbanBoardView: React.FC<KanbanBoardViewProps> = ({
  consultations,
  customers,
  agents,
  currentAgentName,
  onSelectConsultation,
  onNavigateToWorkspace,
}) => {
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>(currentAgentName || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const isGroupOpen = (key: string) => Boolean(expandedGroups[key]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleAllAccordion = () => {
    const hasAnyExpanded = Object.values(expandedGroups).some((v) => v === true);
    if (hasAnyExpanded) {
      setExpandedGroups({});
    } else {
      const allExpanded: Record<string, boolean> = {};
      KANBAN_COLUMNS.forEach((col) => {
        const rawItems = filteredConsultations.filter((c) => getKanbanColumnKey(c) === col.status);
        rawItems.forEach((item) => {
          let subKey = (item.sub_status || col.status).trim();
          if (subKey === '처리완료') subKey = '결제완료';
          allExpanded[`${col.status}-${subKey}`] = true;
        });
      });
      setExpandedGroups(allExpanded);
    }
  };

  // ────────────────────────────────────────────────────
  // 🔍 칸반 내 검색: 연락처·차량번호·주차장명·요약·세부단계 모두 매칭
  // ────────────────────────────────────────────────────
  const filteredConsultations = consultations.filter((cons) => {
    if (cons.is_archived === true) return false;

    const matchAgent = selectedAgentFilter ? cons.agent_name === selectedAgentFilter : true;

    if (!searchQuery.trim()) return matchAgent;

    const rawQuery = searchQuery.trim().toUpperCase();
    const cleanQuery = searchQuery.replace(/[^0-9a-zA-Z가-힣]/g, '').toUpperCase();
    
    const customer = customers.find((c) => c.id === cons.customer_id);

    // customers 테이블 참조: 차량번호, 연락처
    const cPhone = (customer?.phone_number || cons.phone_number || '').replace(/[^0-9]/g, '');
    const cCar = (customer?.car_number || cons.car_number || '').replace(/[^0-9a-zA-Z가-힣]/g, '').toUpperCase();

    // 주차 매칭 정보: 차주/공유자 연락처
    const ownerPhone = (cons.owner_phone || '').replace(/[^0-9]/g, '');
    const userPhone  = (cons.user_phone  || '').replace(/[^0-9]/g, '');

    const parkingName = (cons.parking_name || '').toUpperCase();
    const summary     = (cons.summary     || '').toUpperCase();
    const subStatus   = (cons.sub_status  || '').toUpperCase();
    const subStatusLabel = (SUB_STATUS_LABEL[cons.sub_status || '']?.label || '').toUpperCase();
    const inquiryType = (cons.inquiry_type || '주차 문의').toUpperCase();

    const matchQuery =
      (cleanQuery && (cPhone.includes(cleanQuery) || ownerPhone.includes(cleanQuery) || userPhone.includes(cleanQuery))) ||
      (cleanQuery && cCar.includes(cleanQuery)) ||
      parkingName.includes(rawQuery) ||
      summary.includes(rawQuery) ||
      subStatus.includes(rawQuery) ||
      subStatusLabel.includes(rawQuery) ||
      inquiryType.includes(rawQuery);

    return matchAgent && matchQuery;
  });

  const handleCardClick = (consId: string) => {
    if (onSelectConsultation) onSelectConsultation(consId);
    if (onNavigateToWorkspace) onNavigateToWorkspace();
  };

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6 font-sans">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <KanbanIcon className="w-5 h-5" />
            </div>
            칸반 파이프라인 모니터링 보드
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            대분류 상태(접수 / 해결중 / 완료) 기준 3컬럼 내에서 세부 프로세스 단계별로 접고 펼칠 수 있는 아코디언 관제 보드입니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* 전체 아코디언 토글 버튼 */}
          <button
            type="button"
            onClick={toggleAllAccordion}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-3xs"
            title="모든 세부단계 아코디언 항목을 한 번에 펼치거나 접습니다."
          >
            <ChevronsUpDown className="w-3.5 h-3.5 text-blue-600" />
            <span>아코디언 전체 토글</span>
          </button>

          {/* Agent Filter */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-xs">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-slate-500 font-medium">상담원:</span>
            <select
              value={selectedAgentFilter}
              onChange={(e) => setSelectedAgentFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="">전체 상담원</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.agent_name}>
                  {ag.agent_name} 상담사
                </option>
              ))}
            </select>
          </div>

          {/* Instant Search */}
          <div className="relative w-48 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="차량번호 / 연락처 / 결제메시지 / 주차장..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────── */}
      {/* Kanban Pipeline Columns (3컬럼: 접수/해결중/완료) */}
      {/* ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
        {KANBAN_COLUMNS.map((col) => {
          // getKanbanColumnKey로 복합 분류하여 정확한 칼럼 매핑
          const rawItems = filteredConsultations.filter((c) => getKanbanColumnKey(c) === col.status);
          const colItems = rawItems.filter(
            (c, index, self) => index === self.findIndex((t) => t.id === c.id)
          );

          // 세부 프로세스 단계(sub_status)별 아코디언 그룹 분할
          const subGroupMap = new Map<string, Consultation[]>();

          colItems.forEach((item) => {
            let subKey = (item.sub_status || col.status).trim();
            if (subKey === '처리완료') subKey = '결제완료';
            if (!subGroupMap.has(subKey)) {
              subGroupMap.set(subKey, []);
            }
            subGroupMap.get(subKey)!.push(item);
          });

          const subGroups: { subKey: string; label: string; badgeStyle: string; items: Consultation[] }[] = [];
          subGroupMap.forEach((items, subKey) => {
            subGroups.push({
              subKey,
              label: formatSubStatus(subKey),
              badgeStyle: getSubStatusBadgeStyle(subKey),
              items,
            });
          });

          return (
            <div key={col.status} className="bg-slate-100/80 rounded-xl p-3 border border-slate-200 flex flex-col gap-3 min-h-[550px]">
              {/* Column Header */}
              <div className={`p-3 bg-white rounded-lg border-l-4 shadow-2xs flex justify-between items-center ${col.headerColor}`}>
                <span className="font-bold text-xs flex items-center gap-1.5">
                  {col.emoji} {col.label}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${col.badgeBg}`}>
                  {colItems.length}건
                </span>
              </div>

              {/* Ticket Cards (Accordion Style) */}
              <div className="space-y-3 flex-1 overflow-y-auto custom-scroll pr-0.5">
                {colItems.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    해당 단계의 상담건이 없습니다.
                  </div>
                ) : (
                  subGroups.map((group) => {
                    const groupKey = `${col.status}-${group.subKey}`;
                    const isOpen = isGroupOpen(groupKey);

                    return (
                      <div key={groupKey} className="space-y-2">
                        {/* 아코디언 헤더 바 */}
                        <button
                          type="button"
                          onClick={() => toggleGroup(groupKey)}
                          className="w-full flex items-center justify-between p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-3xs cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isOpen ? (
                              <ChevronDown className="w-4 h-4 text-blue-600 shrink-0 transition-transform" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 transition-transform" />
                            )}
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] border truncate ${group.badgeStyle}`}>
                              ⚡ {group.label}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full shrink-0 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                            {group.items.length}건 {isOpen ? '▲' : '▼'}
                          </span>
                        </button>

                        {/* 아코디언 카드 목록 */}
                        {isOpen && (
                          <div className="space-y-3 pl-2 border-l-2 border-slate-200/80 my-1 animate-in fade-in duration-150">
                            {group.items.map((item) => {
                              const isMine = item.agent_name === currentAgentName;
                              const customer = customers.find((c) => c.id === item.customer_id);
                              const displayPhone = maskTempPhoneNumber(customer?.phone_number || item.phone_number, '', true);
                              const displayCar   = maskTempCarNumber(customer?.car_number   || item.car_number, '');

                              return (
                                <div
                                  key={item.id}
                                  onClick={() => handleCardClick(item.id)}
                                  className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer space-y-2 hover:-translate-y-0.5 group"
                                  title="클릭 시 상담 워크스페이스로 이동"
                                >
                                  {/* 상단: ID + 문의유형 */}
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-mono text-slate-400">
                                      ID: {item.id.slice(0, 8)}
                                    </span>
                                    <span className={`text-[10px] font-extrabold border px-2 py-0.5 rounded shadow-3xs ${
                                      getInquiryTypeBadgeStyle(item.inquiry_type)
                                    }`}>
                                      📂 {item.inquiry_type || '주차 문의'}
                                    </span>
                                  </div>

                                  {/* 요약 메모 */}
                                  <p className="font-bold text-slate-900 text-xs line-clamp-2 leading-relaxed group-hover:text-blue-600 transition-colors">
                                    {item.summary || '등록된 메모 내용이 없습니다.'}
                                  </p>

                                  {/* 고객 연락처 / 차량번호 */}
                                  {(displayPhone || displayCar) && (
                                    <div className="flex gap-1.5 flex-wrap">
                                      {displayPhone && (
                                        <span className="text-[10px] font-mono bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                          📞 {displayPhone}
                                        </span>
                                      )}
                                      {displayCar && (
                                        <span className="text-[10px] font-mono bg-slate-50 text-slate-700 font-bold px-1.5 py-0.5 rounded border border-slate-200 uppercase">
                                          🚗 {displayCar}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* 주차장명 */}
                                  <p className="text-[10px] font-medium text-slate-500 truncate flex items-center gap-1 bg-slate-50 p-1.5 rounded w-fit">
                                    <Building className="w-3 h-3 text-slate-400 shrink-0" />
                                    {item.parking_name || '주차장 미지정'}
                                  </p>

                                  {/* 하단: 담당자 + 편집하기 */}
                                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                                    <span className={`px-2 py-0.5 rounded font-bold ${
                                      isMine ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-800'
                                    }`}>
                                      👤 {item.agent_name || '미지정'}
                                    </span>
                                    <span className="text-blue-600 font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      편집하기 <ExternalLink className="w-3 h-3" />
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
