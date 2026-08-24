/**
 * ZMS CS Helper - 프론트엔드 탑 네비게이션 바 컴포넌트
 *
 * [UX 개선]
 * 1. 통합 검색 결과 드롭다운에서 상담건별 현재 담당 상담사와 소속 팀 또렷하게 노출.
 * 2. 타 상담사 담당 건에 [내 담당으로 가져오기] 핫액션 버튼 시각적 강조.
 * 3. 상담원 로그인 세션 및 전환 연결.
 * 4. 알림 벨 버튼: D-Day / 정체 / 이관 알림 실시간 드롭다운 노출.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  UserCheck,
  ChevronDown,
  User,
  Lock,
  LogOut,
  UserPlus,
  Building,
  Clock,
  CheckCheck,
  AlertCircle,
} from 'lucide-react';
import { Customer, Consultation, InternalAgent, AgentTask } from '../../../backend/types';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useNotifications } from '../../hooks/useNotifications';
import { getSubStatusBadgeStyle, formatSubStatus, getInquiryTypeBadgeStyle } from '../../../lib/utils/consultationArchive';
import { maskTempCarNumber, maskTempPhoneNumber, isTempCarNumber, isTempPhoneNumber } from '../../../lib/utils/normalize';

interface TopNavBarProps {
  activeTab: string;
  customers: Customer[];
  consultations: Consultation[];
  agents: InternalAgent[];
  currentAgent: InternalAgent | null;
  tasks?: AgentTask[];
  onOpenLoginModal: () => void;
  onLogout: () => void;
  onSelectCustomer: (customer: Customer) => void;
  onSelectConsultation: (consId: string) => void;
  onTakeoverConsultation: (consId: string) => void;
  onNavigateToWorkspace?: () => void;
  onNavigateToTasks?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  activeTab,
  customers,
  consultations,
  agents,
  currentAgent,
  tasks = [],
  onOpenLoginModal,
  onLogout,
  onSelectCustomer,
  onSelectConsultation,
  onTakeoverConsultation,
  onNavigateToWorkspace,
  onNavigateToTasks,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifTab, setNotifTab] = useState<'pending' | 'completed'>('pending');

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const agentDropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const currentAgentName = currentAgent?.agent_name || '상담원';

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications({
    consultations,
    customers,
    tasks,
    currentAgentName: currentAgent?.agent_name || '',
  });

  const pendingNotifications = notifications.filter((n) => !n.isRead);
  const completedNotifications = notifications.filter((n) => n.isRead);
  const displayNotifications = notifTab === 'pending' ? pendingNotifications : completedNotifications;

  useClickOutside(searchContainerRef, () => {
    setShowSearchResults(false);
  });

  useClickOutside(agentDropdownRef, () => {
    setShowAgentDropdown(false);
  });

  useClickOutside(notificationRef, () => {
    setShowNotifications(false);
  });

  useEffect(() => {
    setSearchQuery('');
    setShowSearchResults(false);
  }, [activeTab]);

  const filteredConsultations = searchQuery.trim()
    ? consultations.filter((c) => {
        const rawQuery = searchQuery.trim().toUpperCase();
        const cleanQuery = searchQuery.replace(/[^0-9a-zA-Z가-힣]/g, '').toUpperCase();
        if (!cleanQuery && !rawQuery) return false;

        // 메세지 / 메시지 한국어 이중 표기 대응 정규화
        const normQuery = cleanQuery.replace(/메세지/g, '메시지');

        const customer = customers.find((cust) => cust.id === c.customer_id);
        
        const cPhone = (customer?.phone_number || c.phone_number || '').replace(/[^0-9]/g, '');
        const cCar = (customer?.car_number || c.car_number || '').replace(/[^0-9a-zA-Z가-힣]/g, '').toUpperCase();
        
        const ownerPhone = (c.owner_phone || '').replace(/[^0-9]/g, '');
        const userPhone = (c.user_phone || '').replace(/[^0-9]/g, '');

        const parkingName = (c.parking_name || '').toUpperCase();
        const agentName = (c.agent_name || '').toUpperCase();
        const inquiryType = (c.inquiry_type || '').toUpperCase();
        const summary = (c.summary || '').toUpperCase();
        const subStatus = (c.sub_status || '').toUpperCase();
        const cleanSubStatus = subStatus.replace(/[^0-9a-zA-Z가-힣]/g, '').replace(/메세지/g, '메시지');

        return (
          (cleanQuery && (cPhone.includes(cleanQuery) || cCar.includes(cleanQuery) || ownerPhone.includes(cleanQuery) || userPhone.includes(cleanQuery))) ||
          parkingName.includes(rawQuery) ||
          agentName.includes(rawQuery) ||
          inquiryType.includes(rawQuery) ||
          summary.includes(rawQuery) ||
          subStatus.includes(rawQuery) ||
          (normQuery && cleanSubStatus.includes(normQuery))
        );
      })
    : [];

  return (
    <header className="sticky top-0 z-40 flex justify-between items-center px-6 h-14 w-full bg-white border-b border-slate-200 shadow-2xs shrink-0 font-sans">
      {/* Left: Mobile Title & Integrated Instant Search */}
      <div className="flex items-center gap-6 h-full">
        <div className="lg:hidden text-lg font-black text-blue-600">ZMS CS HELPER</div>

        {/* Search Input Bar */}
        <div ref={searchContainerRef} className="relative w-64 md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            placeholder="🔍 차량번호, 연락처, 세부단계(결제메시지 등) 통합 검색 (Ctrl+F)..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg text-xs transition-all outline-none"
          />

          {/* Search Dropdown */}
          {showSearchResults && searchQuery.trim() !== '' && (
            <div className="absolute left-0 top-11 w-full bg-white rounded-xl border border-slate-200 shadow-xl p-2 z-50 max-h-80 overflow-y-auto custom-scroll text-xs">
              <div className="text-[10px] font-bold text-slate-400 px-2 py-1.5 uppercase">
                통합 상담 검색 결과 ({filteredConsultations.length}건)
              </div>
              {filteredConsultations.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">일치하는 상담 정보가 없습니다.</div>
              ) : (
                filteredConsultations.map((cons) => {
                  const isMine = cons.agent_name === currentAgentName;
                  const assignedAgentObj = agents.find((a) => a.agent_name === cons.agent_name);
                  const matchedCust = customers.find(c => c.id === cons.customer_id);

                  return (
                    <div
                      key={cons.id}
                      className="p-2.5 hover:bg-slate-50 rounded-xl flex items-center justify-between gap-3 border-b border-slate-100 last:border-0"
                    >
                      <div
                        onClick={() => {
                          onSelectConsultation(cons.id);
                          setShowSearchResults(false);
                        }}
                        className="flex flex-col cursor-pointer flex-1 gap-1"
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs">[{cons.status}] {cons.parking_name || '주차장 미지정'}</span>
                          {/* 📂 문의 유형 배지 추가 */}
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border shadow-3xs ${
                            getInquiryTypeBadgeStyle(cons.inquiry_type)
                          }`}>
                            📂 {cons.inquiry_type || '주차 문의'}
                          </span>
                          {cons.sub_status && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] border ${getSubStatusBadgeStyle(cons.sub_status)}`}>
                              ⚡ {formatSubStatus(cons.sub_status)}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isMine ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-900'
                          }`}>
                            담당: {cons.agent_name} ({assignedAgentObj?.team_name || 'CS팀'})
                          </span>
                        </div>
                        
                        {/* 🚗 차량 및 연락처 매칭 상세 표시 */}
                        <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap gap-x-2 gap-y-1 font-mono">
                          {matchedCust?.car_number && !isTempCarNumber(matchedCust.car_number) && (
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-bold">
                              🚗 차량: {maskTempCarNumber(matchedCust.car_number)}
                            </span>
                          )}
                          {matchedCust?.phone_number && !isTempPhoneNumber(matchedCust.phone_number) && (
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                              👤 본인: {maskTempPhoneNumber(matchedCust.phone_number, '', true)}
                            </span>
                          )}
                          {cons.user_phone && !isTempPhoneNumber(cons.user_phone) && (
                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold border border-blue-100">
                              👤 차주: {maskTempPhoneNumber(cons.user_phone, '', true)}
                            </span>
                          )}
                          {cons.owner_phone && !isTempPhoneNumber(cons.owner_phone) && (
                            <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold border border-purple-100">
                              👤 공유자: {maskTempPhoneNumber(cons.owner_phone, '', true)}
                            </span>
                          )}
                        </div>
                      </div>

                      {!isMine && (
                        <button
                          type="button"
                          onClick={() => {
                            onTakeoverConsultation(cons.id);
                            setShowSearchResults(false);
                          }}
                          className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px] shrink-0 cursor-pointer shadow-2xs flex items-center gap-1"
                        >
                          <UserPlus className="w-3 h-3" />
                          내 담당으로 가져오기
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: 알림 벨 & Account */}
      <div className="flex items-center gap-3">
        {/* 🔔 알림 벨 드롭다운 */}
        <div ref={notificationRef} className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 rounded-full transition-all relative cursor-pointer ${
              unreadCount > 0 ? 'text-red-600 bg-red-50 hover:bg-red-100 ring-2 ring-red-400/40' : 'text-slate-500 hover:bg-slate-100'
            }`}
            title="실시간 알림 및 마감 예정 TODO"
          >
            <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'animate-pulse' : ''}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 shadow-2xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-11 w-80 bg-white rounded-xl border border-slate-200 shadow-xl z-50 text-xs overflow-hidden">
              {/* 헤더 */}
              <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 bg-slate-50">
                <span className="font-bold text-slate-800 text-xs">
                  🔔 알림
                  {unreadCount > 0 && (
                    <span className="ml-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="w-3 h-3" />
                    모두 읽음
                  </button>
                )}
              </div>

              {/* 탭 스위처: 미확인 알림 (미해결) vs 확인 알림 (미해결) */}
              <div className="flex border-b border-slate-200 bg-slate-100/60 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setNotifTab('pending')}
                  className={`flex-1 py-1.5 text-center text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    notifTab === 'pending'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                  }`}
                >
                  <span>🔔 미확인 알림 (미해결)</span>
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setNotifTab('completed')}
                  className={`flex-1 py-1.5 text-center text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    notifTab === 'completed'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                  }`}
                >
                  <span>✅ 확인 알림 (미해결)</span>
                  <span className="bg-slate-200 text-slate-700 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                    {notifications.filter((n) => n.isRead).length}
                  </span>
                </button>
              </div>

              {/* 알림 목록 */}
              <div className="max-h-72 overflow-y-auto">
                {displayNotifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    {notifTab === 'pending' ? (
                      <div className="space-y-1">
                        <p className="font-bold text-slate-500 text-sm">🎉 미확인 신규 알림이 없습니다!</p>
                        <p className="text-[11px] text-slate-400">모든 중요한 마감 및 이관 알림을 확인했습니다.</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="font-bold text-slate-500 text-sm">📋 확인한 알림 이력이 없습니다.</p>
                        <p className="text-[11px] text-slate-400">알림을 클릭하여 확인하면 이곳으로 모입니다.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  displayNotifications.slice(0, 25).map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markAsRead(notif.id);
                        setShowNotifications(false);

                        if (notif.taskId || notif.type === 'task_due' || notif.type === 'task_transferred') {
                          if (notif.consultationId) {
                            onSelectConsultation(notif.consultationId);
                          }
                          if (onNavigateToTasks) {
                            onNavigateToTasks();
                          }
                        } else if (notif.consultationId) {
                          onSelectConsultation(notif.consultationId);
                          if (onNavigateToWorkspace) {
                            onNavigateToWorkspace();
                          }
                        }
                      }}
                      className={`flex gap-3 px-4 py-3 border-b border-slate-50 last:border-0 cursor-pointer transition-colors ${
                        notif.isRead
                          ? 'bg-white hover:bg-slate-50 opacity-80'
                          : 'bg-blue-50/70 hover:bg-blue-100/60'
                      }`}
                    >
                      {/* 아이콘 */}
                      <div className="mt-0.5 shrink-0">
                        {notif.type === 'in_progress' && <span className="text-base">⚡</span>}
                        {notif.type === 'stale' && <AlertCircle className="w-4 h-4 text-amber-500" />}
                        {notif.type === 'takeover' && <span className="text-base">📋</span>}
                        {notif.type === 'assigned' && <span className="text-base">✅</span>}
                        {notif.type === 'task_due' && <span className="text-base">⏰</span>}
                        {notif.type === 'task_transferred' && <span className="text-base">📌</span>}
                        {notif.type === 'dday' && <span className="text-base">📅</span>}
                      </div>
                      {/* 내용 */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-slate-800 leading-snug truncate ${
                          !notif.isRead ? 'text-blue-900' : ''
                        }`}>
                          {notif.title}
                        </p>
                        <p className="text-slate-600 mt-0.5 leading-snug">{notif.body}</p>
                        <p className="text-slate-400 mt-1 flex items-center gap-1 text-[10px]">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(notif.createdAt).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      {/* 미읽음 점 */}
                      {!notif.isRead && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 shrink-0 animate-ping" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-slate-200"></div>

        {/* Agent Account Dropdown */}
        <div ref={agentDropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setShowAgentDropdown(!showAgentDropdown)}
            className="flex items-center gap-2 hover:bg-slate-50 p-1.5 rounded-lg transition-colors border border-slate-200 cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {currentAgentName.slice(0, 1)}
            </div>
            <div className="flex flex-col text-left hidden sm:flex">
              <span className="text-xs font-bold text-slate-800 leading-none">{currentAgentName}</span>
              <span className="text-[10px] text-emerald-600 font-medium">인증 로그인 중</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {showAgentDropdown && (
            <div className="absolute right-0 top-11 w-52 bg-white rounded-xl border border-slate-200 shadow-xl p-2 z-50 text-xs space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 border-b border-slate-100 pb-1.5">
                로그인 세션: {currentAgent?.email || currentAgentName}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAgentDropdown(false);
                  onOpenLoginModal();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-blue-50 text-blue-700 font-semibold cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>계정 로그인 / 전환</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAgentDropdown(false);
                  onLogout();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-red-50 text-red-600 font-semibold cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>로그아웃</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
