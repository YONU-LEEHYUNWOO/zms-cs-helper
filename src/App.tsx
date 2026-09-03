/**
 * ZMS CS Helper - 메인 애플리케이션 엔트리 및 인증 라우터
 * 
 * [아키텍처 구조]
 * - 상태 및 비즈니스 로직: `src/front/hooks/useAppData.ts`
 * - 프론트엔드 UI 컴포넌트: `src/front/components/`
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from './lib/contexts/AuthContext';
import { useAppData } from './front/hooks/useAppData';
import { consultationRepository } from './backend/repositories/ConsultationRepositoryImpl';

// 프론트엔드 UI 컴포넌트
import { SideNavBar } from './front/components/navigation/SideNavBar';
import { TopNavBar } from './front/components/navigation/TopNavBar';
import { MainConsultationHub } from './front/components/workspace/MainConsultationHub';
import { CalendarView } from './front/components/calendar/CalendarView';
import { KanbanBoardView } from './front/components/kanban/KanbanBoardView';
import { AdminPanel } from './front/components/admin/AdminPanel';
import { LogsArchiveView } from './front/components/logs/LogsArchiveView';
import { SupportAiKms } from './front/components/support/SupportAiKms';
import { TaskManagementView } from './front/components/tasks/TaskManagementView';
import { LoginModal } from './front/components/auth/LoginModal';
import { AgentProfileModal } from './front/components/auth/AgentProfileModal';
import { ServiceUserGuideModal } from './front/components/support/ServiceUserGuideModal';

import { useNotifications } from './front/hooks/useNotifications';
import { isAdminAgent } from './lib/utils/adminUtils';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'workspace' | 'calendar' | 'kanban' | 'tasks' | 'admin' | 'logs' | 'support'
  >('workspace');

  const { session, agent: currentAgent, isLoading, signOut, refreshAgentData, setAgentOverride } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAgentProfileModalOpen, setIsAgentProfileModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoading && !session) {
      setIsLoginModalOpen(true);
    }
  }, [isLoading, session]);

  const currentAgentName = currentAgent?.agent_name || '상담원';

  // 모든 상태와 비즈니스 핸들러는 커스텀 훅이 담당 (500라인 최적화 달성!)
  const appData = useAppData(currentAgent, currentAgentName);

  // 🔔 사내 알림 관제 단일 원본 훅
  const notifState = useNotifications({
    consultations: appData.allConsultations,
    customers: appData.customers,
    tasks: appData.tasks,
    currentAgentName: currentAgentName,
  });

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans antialiased overflow-hidden">
      <SideNavBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentAgent={currentAgent}
        notifications={notifState.notifications}
        unreadCount={notifState.unreadCount}
        onMarkAsRead={notifState.markAsRead}
        onMarkAllAsRead={notifState.markAllAsRead}
        onSelectConsultation={(consId) => {
          appData.handleSelectConsultation(consId);
          setActiveTab('workspace');
        }}
        onNavigateToTasks={() => setActiveTab('tasks')}
        onResetForm={appData.handleResetForm}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenAgentProfileModal={() => setIsAgentProfileModalOpen(true)}
        onOpenGuideModal={() => setIsGuideModalOpen(true)}
        onLogout={() => {
          signOut();
          setIsLoginModalOpen(true);
        }}
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <div className={`flex-1 flex flex-col h-screen overflow-y-auto transition-all duration-300 ${
        isSidebarCollapsed ? 'md:ml-[80px]' : 'md:ml-[260px]'
      }`}>
        <TopNavBar
          activeTab={activeTab}
          customers={appData.customers}
          consultations={appData.allConsultations}
          agents={appData.agents}
          currentAgent={currentAgent}
          tasks={appData.tasks}
          notifications={notifState.notifications}
          unreadCount={notifState.unreadCount}
          onMarkAsRead={notifState.markAsRead}
          onMarkAllAsRead={notifState.markAllAsRead}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onLogout={() => {
            signOut();
            setIsLoginModalOpen(true);
          }}
          onSelectCustomer={(cust) => {
            appData.handleUpdateCustomerField('id', cust.id);
            const foundCons =
              appData.allConsultations.find((c) => c.customer_id === cust.id && c.status !== '완료') ||
              appData.allConsultations.find((c) => c.customer_id === cust.id);
            if (foundCons) {
              appData.handleSelectConsultation(foundCons.id);
            }
            setActiveTab('workspace');
          }}
          onSelectConsultation={(consId) => {
            appData.handleSelectConsultation(consId);
            setActiveTab('workspace');
          }}
          onTakeoverConsultation={(consId) => {
            appData.handleTakeoverConsultation(consId);
            setActiveTab('workspace');
          }}
          onNavigateToWorkspace={() => setActiveTab('workspace')}
          onNavigateToTasks={() => setActiveTab('tasks')}
        />

        <main className="flex-1 p-4 md:p-6 bg-slate-50 overflow-y-auto">
          {activeTab === 'workspace' && (
            <MainConsultationHub
              customer={appData.selectedCustomer}
              parkingSpots={appData.parkingSpots}
              savedTemplates={appData.templates}
              tasks={appData.tasks}
              consultations={appData.allConsultations}
              activeConsultation={appData.activeConsultation}
              currentAgentName={currentAgentName}
              agents={appData.agents}
              notes={appData.notes}
              setNotes={appData.setNotes}
              onChangeCustomerField={appData.handleUpdateCustomerField}
              onSelectRecommendedParking={appData.handleSelectRecommendedParking}
              onChangeStatus={appData.handleChangeStatus}
              onChangeSubStatus={appData.handleChangeSubStatus}
              onChangeAssignedAgent={appData.handleChangeAssignedAgent}
              onChangeHopeDate={async (newDate) => {
                if (appData.activeConsultation?.id) {
                  const updated = {
                    ...appData.activeConsultation,
                    hope_date: newDate,
                    updated_at: new Date().toISOString(),
                  };
                  await consultationRepository.saveConsultation(updated);
                }
              }}
              onAddTask={appData.handleAddTask}
              onToggleTask={appData.handleToggleTask}
              onSaveLog={appData.handleSaveLog}
              onResetForm={appData.handleResetForm}
              onSelectConsultation={appData.handleSelectConsultation}
              onStartNewConsultation={appData.handleStartNewConsultation}
              isExistingConsultation={appData.isExistingConsultation}
              matchingSuggestion={appData.matchingSuggestion}
              onApplySuggestion={appData.handleApplySuggestion}
              onDismissSuggestion={appData.handleDismissSuggestion}
              activeLocks={appData.activeLocks}
              onNavigateToKanban={() => setActiveTab('kanban')}
              onNavigateToTasksTab={() => setActiveTab('tasks')}
              onDeleteTask={appData.handleDeleteTask}
              onAddTemplate={appData.handleAddTemplate}
              onEditTemplate={appData.handleEditTemplate}
              onDeleteTemplate={appData.handleDeleteTemplate}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              consultations={appData.consultations}
              tasks={appData.tasks}
              agents={appData.agents}
              customers={appData.customers}
              currentAgentName={currentAgentName}
              onSelectConsultation={appData.handleSelectConsultation}
              onNavigateToWorkspace={() => setActiveTab('workspace')}
            />
          )}

          {activeTab === 'kanban' && (
            <KanbanBoardView
              consultations={appData.consultations}
              customers={appData.customers}
              agents={appData.agents}
              currentAgentName={currentAgentName}
              onSelectConsultation={appData.handleSelectConsultation}
              onNavigateToWorkspace={() => setActiveTab('workspace')}
              onUpdateStatus={(consId, newStatus) => {
                consultationRepository.updateConsultationStatus(consId, newStatus);
              }}
            />
          )}

          {activeTab === 'tasks' && (
            <TaskManagementView
              tasks={appData.tasks}
              agents={appData.agents}
              consultations={appData.consultations}
              currentAgentName={currentAgentName}
              onToggleTask={appData.handleToggleTask}
              onDeleteTask={appData.handleDeleteTask}
              onReassignTask={appData.handleReassignTask}
              onAddTask={appData.handleAddTask}
              onEditTask={appData.handleEditTask}
              onSelectConsultation={appData.handleSelectConsultation}
              onNavigateToWorkspace={() => setActiveTab('workspace')}
            />
          )}

          {activeTab === 'admin' && (
            isAdminAgent(currentAgent) ? (
              <AdminPanel
                agents={appData.agents}
                templates={appData.templates}
                customers={appData.customers}
                consultations={appData.showOlderArchive ? appData.allConsultations : appData.consultations}
                tasks={appData.tasks}
                currentAgentName={currentAgentName}
                showOlderArchive={appData.showOlderArchive}
                olderArchiveCount={appData.olderArchiveCount}
                toggleShowOlderArchive={appData.toggleShowOlderArchive}
                onAddAgent={appData.handleAddAgent}
                onToggleAgentStatus={appData.handleToggleAgentStatus}
                onDeleteAgent={appData.handleDeleteAgent}
                onAddTemplate={appData.handleAddTemplate}
                onEditTemplate={appData.handleEditTemplate}
                onDeleteTemplate={appData.handleDeleteTemplate}
                onToggleBlacklist={appData.handleToggleBlacklist}
                onDeleteConsultation={appData.handleDeleteConsultation}
                onDeleteCustomer={appData.handleDeleteCustomer}
                onDeleteTask={appData.handleDeleteTask}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 min-h-screen">
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-md max-w-md w-full flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-4">
                    <span className="text-2xl font-black">🔒</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mb-2">어드민 전용 데이터 마스터</h2>
                  <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                    데이터 마스터 관리자는 최고 관리자(ADMIN) 권한으로 등록된 상담사 계정만 접근하실 수 있습니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('workspace')}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    상담 워크스페이스로 이동
                  </button>
                </div>
              </div>
            )
          )}

          {activeTab === 'logs' && (
            <LogsArchiveView 
              consultations={appData.showOlderArchive ? appData.allConsultations : appData.consultations} 
              callLogs={appData.callLogs} 
              agents={appData.agents}
              currentAgentName={currentAgentName}
              showOlderArchive={appData.showOlderArchive}
              olderArchiveCount={appData.olderArchiveCount}
              toggleShowOlderArchive={appData.toggleShowOlderArchive}
            />
          )}

          {activeTab === 'support' && (
            <SupportAiKms consultations={appData.consultations} />
          )}
        </main>
      </div>

      <LoginModal
        isOpen={isLoginModalOpen || (!isLoading && !session)}
        isMandatory={!session}
        onClose={() => {
          if (session) setIsLoginModalOpen(false);
        }}
        onLoginSuccess={() => setIsLoginModalOpen(false)}
      />

      <AgentProfileModal
        isOpen={isAgentProfileModalOpen}
        onClose={() => setIsAgentProfileModalOpen(false)}
        currentAgent={currentAgent}
        agents={appData.agents}
        onSaveAgent={async (data) => {
          await appData.handleSaveAgentProfile(data);
          await refreshAgentData();
        }}
        onRegisterNewAgent={appData.handleRegisterNewAgent}
        onSwitchAgent={(agentName) => {
          const targetAgentObj = appData.agents.find((a) => a.agent_name === agentName || a.email?.split('@')[0] === agentName);
          if (targetAgentObj) {
            setAgentOverride(targetAgentObj);
          } else {
            appData.handleChangeAssignedAgent(agentName);
          }
          setIsAgentProfileModalOpen(false);
        }}
        onUpdateAgentRole={appData.handleUpdateAgentRole}
        onLogout={() => {
          signOut();
          setIsAgentProfileModalOpen(false);
          setIsLoginModalOpen(true);
        }}
      />

      <ServiceUserGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />
    </div>
  );
};
