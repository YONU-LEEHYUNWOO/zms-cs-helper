/**
 * ZMS CS Helper - 통합 어드민 패널 컴포넌트
 * 
 * [DB 행/열 엑셀 다운로드 & 실시간 데이터 감사 도구]
 * 1. 실시간 상담 마스터 DB (Consultations) & 고객 원장 DB (Customers) 행/열 테이블 뷰어 구축.
 * 2. [📥 상담 DB 엑셀(CSV) 다운로드] & [📥 고객 원장 CSV 다운로드] 버튼 구현.
 * 3. [🧹 DB 캐시 데이터 완전 초기화 (Reset & Sanitation)] 버튼 탑재.
 * 
 * [주의] 기존 Stitch 디자인 100% 유지
 */

import React, { useState } from 'react';
import { Shield, Users, MessageSquare, UserPlus, Database, CheckCircle } from 'lucide-react';
import { InternalAgent, SavedTemplate, Customer, Consultation, AgentTask } from '../../../backend/types';
import { consultationRepository } from '../../../backend/repositories/ConsultationRepositoryImpl';
import { getResolvedStatus } from '../../../lib/utils/consultationArchive';

import { DbViewerTab } from './tabs/DbViewerTab';
import { AgentManagerTab } from './tabs/AgentManagerTab';
import { TemplateManagerTab } from './tabs/TemplateManagerTab';
import { CustomerManagerTab } from './tabs/CustomerManagerTab';

interface AdminPanelProps {
  agents: InternalAgent[];
  templates: SavedTemplate[];
  customers: Customer[];
  consultations?: Consultation[];
  tasks?: AgentTask[];
  currentAgentName?: string;
  onAddAgent: (agent: {
    agent_name: string;
    email: string;
    password_hash: string;
    team_name?: string;
    role?: 'AGENT' | 'LEADER' | 'ADMIN';
  }) => void;
  onToggleAgentStatus: (agentId: string) => void;
  onDeleteAgent: (agentId: string) => void;
  onAddTemplate: (title: string, content: string, createdBy: string) => void;
  onEditTemplate?: (templateId: string, title: string, content: string) => void;
  onDeleteTemplate: (templateId: string) => void;
  onToggleBlacklist: (customerId: string, note?: string) => void;
  onDeleteConsultation?: (consId: string) => void;
  onDeleteCustomer?: (customerId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  showOlderArchive?: boolean;
  olderArchiveCount?: number;
  toggleShowOlderArchive?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  agents,
  templates,
  customers,
  consultations = [],
  tasks = [],
  currentAgentName,
  onAddAgent,
  onToggleAgentStatus,
  onDeleteAgent,
  onAddTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onToggleBlacklist,
  onDeleteConsultation,
  onDeleteCustomer,
  onDeleteTask,
  showOlderArchive,
  olderArchiveCount,
  toggleShowOlderArchive,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'db_viewer' | 'agents' | 'templates' | 'customers'>('db_viewer');
  const [adminToast, setAdminToast] = useState<string | null>(null);

  const handleSanitizeDuplicates = async () => {
    try {
      const list = await consultationRepository.getConsultations();
      const map = new Map<string, Consultation>();
      let removedCount = 0;

      list.forEach((item) => {
        if (!item || !item.id) return;
        if (map.has(item.id)) removedCount++;
        map.set(item.id, item);
      });

      const cleaned = Array.from(map.values());
      await consultationRepository.initStorage(true);
      for (const item of cleaned) {
        const resolvedStatus = getResolvedStatus(item);
        await consultationRepository.saveConsultation({
          ...item,
          status: resolvedStatus,
        });
      }

      setAdminToast(`🧹 DB 상태 무결성이 맞춰지고 중복 데이터 ${removedCount}건이 깨끗하게 정돈되었습니다.`);
      setTimeout(() => {
        setAdminToast(null);
        window.location.reload();
      }, 1500);
    } catch {
      alert('정돈할 데이터가 없습니다.');
    }
  };

  const downloadConsultationsCSV = (targetAgentFilter?: string) => {
    const list = targetAgentFilter
      ? consultations.filter((c) => c.agent_name === targetAgentFilter)
      : consultations;

    if (!list || list.length === 0) {
      alert(targetAgentFilter ? `'${targetAgentFilter}' 상담사의 다운로드할 상담 데이터가 없습니다.` : '다운로드할 상담 데이터가 없습니다.');
      return;
    }

    const headers = [
      '상담ID', '상담직원ID(agent_id)', '담당상담사(agent_name)', '차량번호(car_number)',
      '연락처(phone_number)', '고객ID', '주차장명', '문의유형', '상태',
      '보관여부(is_archived)', '희망일자(hope_date)', '차주연락처(user_phone)', 
      '공유자연락처(owner_phone)', '주차시작일(parking_start_date)', '상담요약메모',
      '최초접수일(created_at)', '최종수정일(updated_at)',
    ];

    const rows = list.map((c) => {
      const matchCustomer = customers.find(cust => cust.id === c.customer_id);
      const matchedAgent = agents.find(a => a.agent_name === c.agent_name || a.email?.split('@')[0] === c.agent_name || a.email === c.agent_name || a.id === c.agent_id);
      const realAgentId = matchedAgent?.id || c.agent_id || 'unassigned';
      const cNum = matchCustomer?.car_number || c.car_number || '';
      const pNum = matchCustomer?.phone_number || c.phone_number || '';
      return [
        c.id, realAgentId, c.agent_name, cNum, pNum,
        c.customer_id, `"${c.parking_name || ''}"`, c.inquiry_type || '', c.status,
        c.is_archived ? 'TRUE(보관됨)' : 'FALSE(활성)', c.hope_date || '',
        c.user_phone || '', c.owner_phone || '', c.parking_start_date || '',
        `"${(c.summary || '').replace(/"/g, '""')}"`, c.created_at, c.updated_at,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const agentTag = targetAgentFilter ? `_${targetAgentFilter}` : '';
    link.setAttribute('download', `ZMS_Consultations_DB${agentTag}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setAdminToast(`📊 상담 마스터 DB ${targetAgentFilter ? `'${targetAgentFilter}' 데이터` : ''}가 CSV 엑셀 파일로 다운로드되었습니다.`);
    setTimeout(() => setAdminToast(null), 3000);
  };

  const downloadCustomersCSV = () => {
    if (!customers || customers.length === 0) {
      alert('다운로드할 고객 데이터가 없습니다.');
      return;
    }

    const headers = [
      '고객ID', '연락처', '차량번호', '차종', '상세모델', '은행명',
      '계좌번호', '예금주', '블랙리스트여부', '특이사항메모', '등록일',
    ];

    const rows = customers.map((c) => [
      c.id, c.phone_number, c.car_number, c.car_type || '', c.car_detail || '',
      c.bank_name || '', c.account_number || '', c.account_holder || '',
      c.is_blacklist ? 'TRUE(블랙리스트)' : 'FALSE',
      `"${(c.special_note || '').replace(/"/g, '""')}"`, c.created_at,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ZMS_Customers_DB_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setAdminToast('📊 고객 원장 DB가 CSV 엑셀 파일로 다운로드되었습니다.');
    setTimeout(() => setAdminToast(null), 3000);
  };

  const downloadTasksCSV = (targetAgentFilter?: string) => {
    const list = targetAgentFilter
      ? tasks.filter((t) => t.agent_name === targetAgentFilter || t.created_by === targetAgentFilter)
      : tasks;

    if (!list || list.length === 0) {
      alert(targetAgentFilter ? `'${targetAgentFilter}' 상담사의 다운로드할 업무/TODO 데이터가 없습니다.` : '다운로드할 업무/TODO 데이터가 없습니다.');
      return;
    }

    const headers = [
      'TaskID', '연관상담ID', '작성자계정(created_by)', '담당상담사(agent_name)',
      '업무분류태그(tag)', 'TODO내용(task_title)', '마감일시(due_date)', '완료여부(is_completed)', '등록일(created_at)'
    ];

    const rows = list.map((t) => [
      t.id, t.consultation_id || '', t.created_by || '', t.agent_name,
      t.tag || '', `"${(t.task_title || '').replace(/"/g, '""')}"`, t.due_date || '',
      t.is_completed ? 'TRUE(완료)' : 'FALSE(미완료)', t.created_at || '',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const agentTag = targetAgentFilter ? `_${targetAgentFilter}` : '';
    link.setAttribute('download', `ZMS_AgentTasks_DB${agentTag}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setAdminToast(`📊 업무/TODO 마스터 DB ${targetAgentFilter ? `'${targetAgentFilter}' 데이터` : ''}가 CSV 엑셀 파일로 다운로드되었습니다.`);
    setTimeout(() => setAdminToast(null), 3000);
  };

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6 font-sans">
      {adminToast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{adminToast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-white shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            어드민 통합 관리 패널 & DB 감사 도구
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            상담원 계정 및 안내 템플릿 관리, 블랙리스트 지정, 실시간 DB 테이블 감사 및 CSV 엑셀 다운로드를 제공합니다.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveSubTab('db_viewer')}
            className={`px-3.5 py-1.5 font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'db_viewer' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            실시간 DB 엑셀 다운로드
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('agents')}
            className={`px-3.5 py-1.5 font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'agents' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            상담원 계정 ({agents.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('templates')}
            className={`px-3.5 py-1.5 font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'templates' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            안내 템플릿 ({templates.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('customers')}
            className={`px-3.5 py-1.5 font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'customers' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            고객 원장 ({customers.length})
          </button>
        </div>
      </div>

      {/* Tabs */}
      {activeSubTab === 'db_viewer' && (
        <DbViewerTab
          agents={agents}
          consultations={consultations}
          customers={customers}
          tasks={tasks}
          currentAgentName={currentAgentName}
          downloadConsultationsCSV={downloadConsultationsCSV}
          downloadCustomersCSV={downloadCustomersCSV}
          downloadTasksCSV={downloadTasksCSV}
          handleSanitizeDuplicates={handleSanitizeDuplicates}
          onDeleteConsultation={onDeleteConsultation}
          onDeleteTask={onDeleteTask}
          setAdminToast={setAdminToast}
          initStorage={(clear) => consultationRepository.initStorage(clear)}
          showOlderArchive={showOlderArchive}
          olderArchiveCount={olderArchiveCount}
          toggleShowOlderArchive={toggleShowOlderArchive}
        />
      )}

      {activeSubTab === 'agents' && (
        <AgentManagerTab
          agents={agents}
          onAddAgent={onAddAgent}
          onDeleteAgent={onDeleteAgent}
          setAdminToast={setAdminToast}
        />
      )}

      {activeSubTab === 'templates' && (
        <TemplateManagerTab
          templates={templates}
          onAddTemplate={onAddTemplate}
          onEditTemplate={onEditTemplate}
          onDeleteTemplate={onDeleteTemplate}
          setAdminToast={setAdminToast}
        />
      )}

      {activeSubTab === 'customers' && (
        <CustomerManagerTab
          customers={customers}
          downloadCustomersCSV={downloadCustomersCSV}
          onToggleBlacklist={onToggleBlacklist}
          onDeleteCustomer={onDeleteCustomer}
        />
      )}
    </div>
  );
};
