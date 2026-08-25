import React from 'react';
import {
  LayoutDashboard,
  Calendar as CalendarIcon,
  Kanban,
  ShieldCheck,
  FileText,
  HelpCircle,
  LogOut,
  UserCheck,
  Plus,
  Lock,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { InternalAgent } from '../../../backend/types';

interface SideNavBarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  currentAgent: InternalAgent | null;
  onOpenLoginModal: () => void;
  onOpenAgentProfileModal?: () => void;
  onOpenGuideModal?: () => void;
  onLogout: () => void;
  onResetForm?: () => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

export const SideNavBar: React.FC<SideNavBarProps> = ({
  activeTab,
  setActiveTab,
  currentAgent,
  onOpenLoginModal,
  onOpenAgentProfileModal,
  onOpenGuideModal,
  onLogout,
  onResetForm,
  isCollapsed,
  onToggle,
}) => {
  const agentName = currentAgent?.agent_name || '로그인 필요';
  const teamName = currentAgent?.team_name || '비인증 상태';

  return (
    <aside className={`hidden lg:flex flex-col h-screen border-r border-slate-200 bg-white p-4 gap-2 shrink-0 z-40 fixed left-0 top-0 shadow-2xs transition-all duration-300 ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
      {/* Brand Header */}
      <div className={`flex items-center mb-6 pt-2 px-1 ${
        isCollapsed ? 'flex-col gap-3 justify-center' : 'justify-between'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md shrink-0">
            Z
          </div>
          {!isCollapsed && (
            <div className="animate-in fade-in duration-200">
              <h1 className="font-bold text-slate-900 leading-tight text-base">ZMS Admin</h1>
              <p className="text-xs text-slate-500 font-medium">CS Management System</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggle}
          className={`p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer shrink-0 ${
            isCollapsed ? 'mt-1' : ''
          }`}
          title={isCollapsed ? '메뉴 펼치기' : '메뉴 접기'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Primary Action Button */}
      <button
        type="button"
        onClick={() => {
          if (onResetForm) onResetForm();
          setActiveTab('workspace');
        }}
        className={`bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all duration-200 shadow-sm flex items-center justify-center cursor-pointer ${
          isCollapsed 
            ? 'w-12 h-12 rounded-2xl mx-auto mb-4 p-0' 
            : 'w-full py-2.5 mb-4 gap-2 text-xs'
        }`}
        title="새로운 상담 등록"
      >
        <Plus className="w-4 h-4 shrink-0" />
        {!isCollapsed && <span className="animate-in fade-in duration-200">새로운 상담 등록</span>}
      </button>

      {/* Navigation Links */}
      <nav className="flex-1 flex flex-col gap-1.5 overflow-y-auto custom-scroll text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('workspace')}
          className={`flex items-center rounded-xl transition-all cursor-pointer ${
            isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 gap-3'
          } ${
            activeTab === 'workspace'
              ? 'bg-blue-50 text-blue-600 font-bold border border-blue-100 shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
          title="상담 워크스페이스"
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="animate-in fade-in duration-200">상담 워크스페이스</span>}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center rounded-xl transition-all cursor-pointer ${
            isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 gap-3'
          } ${
            activeTab === 'calendar'
              ? 'bg-blue-50 text-blue-600 font-bold border border-blue-100 shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
          title="상담 일정 & 캘린더"
        >
          <CalendarIcon className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="animate-in fade-in duration-200">상담 일정 & 캘린더</span>}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('kanban')}
          className={`flex items-center rounded-xl transition-all cursor-pointer ${
            isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 gap-3'
          } ${
            activeTab === 'kanban'
              ? 'bg-blue-50 text-blue-600 font-bold border border-blue-100 shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
          title="칸반 파이프라인"
        >
          <Kanban className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="animate-in fade-in duration-200">칸반 파이프라인</span>}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center rounded-xl transition-all cursor-pointer ${
            isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 gap-3'
          } ${
            activeTab === 'tasks'
              ? 'bg-blue-50 text-blue-600 font-bold border border-blue-100 shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
          title="업무 & TODO 관제"
        >
          <CheckSquare className="w-4 h-4 shrink-0 text-blue-600" />
          {!isCollapsed && <span className="animate-in fade-in duration-200">업무 & TODO 관제</span>}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('admin')}
          className={`flex items-center rounded-xl transition-all cursor-pointer ${
            isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 gap-3'
          } ${
            activeTab === 'admin'
              ? 'bg-blue-50 text-blue-600 font-bold border border-blue-100 shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
          title="데이터 마스터 관리자"
        >
          <ShieldCheck className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="animate-in fade-in duration-200">데이터 마스터 관리자</span>}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`flex items-center rounded-xl transition-all cursor-pointer ${
            isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 gap-3'
          } ${
            activeTab === 'logs'
              ? 'bg-blue-50 text-blue-600 font-bold border border-blue-100 shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
          title="상담 & 녹취 이력"
        >
          <FileText className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="animate-in fade-in duration-200">상담 & 녹취 이력</span>}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('support')}
          className={`flex items-center rounded-xl transition-all cursor-pointer ${
            isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 gap-3'
          } ${
            activeTab === 'support'
              ? 'bg-blue-50 text-blue-600 font-bold border border-blue-100 shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
          title="Support AI / KMS"
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="animate-in fade-in duration-200">Support AI / KMS</span>}
        </button>

        {onOpenGuideModal && (
          <button
            type="button"
            onClick={onOpenGuideModal}
            className={`flex items-center rounded-xl transition-all cursor-pointer bg-slate-100/80 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold border border-slate-200/80 ${
              isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 gap-3'
            }`}
            title="📖 서비스 이용 가이드 & 사용 매뉴얼"
          >
            <BookOpen className="w-4 h-4 shrink-0 text-blue-600" />
            {!isCollapsed && <span className="animate-in fade-in duration-200 font-bold">서비스 이용 가이드</span>}
          </button>
        )}
      </nav>

      {/* Footer Profile & Auth Controls */}
      <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 mt-auto">
        <div
          onClick={() => {
            if (onOpenAgentProfileModal) {
              onOpenAgentProfileModal();
            } else {
              onOpenLoginModal();
            }
          }}
          className={`bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-100 flex items-center cursor-pointer transition-all hover:shadow-2xs ${
            isCollapsed ? 'justify-center p-2' : 'p-2.5 justify-between'
          }`}
          title="클릭 시 내 프로필 설정, 계정 관리 및 샌드박스 전환"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              {agentName.slice(0, 1)}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col text-left min-w-0 animate-in fade-in duration-200">
                <span className="text-xs font-bold text-slate-800 leading-none truncate">{agentName}</span>
                <span className="text-[10px] text-slate-500 font-medium mt-1 truncate">
                  {teamName} {currentAgent?.email ? `• ${currentAgent.email}` : ''}
                </span>
              </div>
            )}
          </div>
          {!isCollapsed && <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
        </div>

        <button
          type="button"
          onClick={onLogout}
          className={`flex items-center text-slate-500 hover:bg-slate-100 hover:text-red-600 rounded-xl transition-all text-xs cursor-pointer ${
            isCollapsed ? 'justify-center p-3' : 'px-3 py-2 gap-3'
          }`}
          title="로그아웃"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="animate-in fade-in duration-200">로그아웃</span>}
        </button>
      </div>
    </aside>
  );
};
