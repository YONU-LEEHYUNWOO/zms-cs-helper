/**
 * ZMS CS Helper - 알림 센터 전용 팝업/모달 컴포넌트 (NotificationCenterModal)
 * 
 * [역할 및 아키텍처 위치]
 * - src/front/components/navigation/components/NotificationCenterModal.tsx
 * - 좌측 사이드바(SideNavBar) 및 상단 네비바(TopNavBar) 공동 사용 알림 관제 모달
 * - Rule 8 (모달 백드롭 디스미스), Rule 2 (500줄 제한 준수) 100% 적용
 */

import React, { useState } from 'react';
import { X, Bell, CheckCheck, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Notification } from '../../../hooks/useNotifications';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onSelectConsultation?: (consId: string) => void;
  onNavigateToTasks?: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectConsultation,
  onNavigateToTasks,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'completed'>('pending');

  if (!isOpen) return null;

  const pendingList = notifications.filter((n) => !n.isRead);
  const completedList = notifications.filter((n) => n.isRead);
  const currentList = activeSubTab === 'pending' ? pendingList : completedList;

  const handleItemClick = (n: Notification) => {
    onMarkAsRead(n.id);
    if (n.consultationId && onSelectConsultation) {
      onSelectConsultation(n.consultationId);
      onClose();
    } else if (n.taskId && onNavigateToTasks) {
      onNavigateToTasks();
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
                <span>🔔 사내 실시간 알림 센터</span>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white font-mono text-[10px] font-black px-2 py-0.5 rounded-full ring-2 ring-white animate-pulse">
                    {unreadCount}건 미확인
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                담당 업무 이관, 처리 정체 및 미완료 알림을 100% 동적으로 실시간 공유합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 탭 헤더 및 전체 읽음 처리 */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center gap-2 shrink-0">
          <div className="flex items-center p-1 bg-slate-200/80 rounded-xl text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => setActiveSubTab('pending')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'pending'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              미확인 알림 ({pendingList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('completed')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'completed'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              확인된 알림 ({completedList.length})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-blue-200"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>전체 읽음</span>
            </button>
          )}
        </div>

        {/* 알림 항목 리스트 영역 */}
        <div className="flex-1 overflow-y-auto custom-scroll p-3 space-y-2">
          {currentList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">
                {activeSubTab === 'pending' ? '미확인된 신규 알림이 없습니다.' : '확인된 알림이 없습니다.'}
              </p>
              <p className="text-[11px] text-slate-400">
                완료된 상담/TODO 건 및 처리 완료 항목은 알림에서 자동 정제됩니다.
              </p>
            </div>
          ) : (
            currentList.map((n) => (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 relative group ${
                  !n.isRead
                    ? 'bg-blue-50/50 border-blue-200/80 hover:bg-blue-50 hover:border-blue-300'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                {!n.isRead && (
                  <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0 animate-ping" />
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-xs text-slate-900 truncate">{n.title}</span>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {n.body}
                  </p>
                </div>

                <div className="self-center shrink-0 text-slate-400 group-hover:text-blue-600 transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* 푸터 하단 바 */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-500 font-medium shrink-0">
          <span>💡 알림 항목 클릭 시 해당 워크스페이스/업무로 이동합니다.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
