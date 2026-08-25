/**
 * ZMS CS Helper - 메인 상담 워크스페이스 컴포넌트
 * 
 * [DB 무결성 & 일자 직접 지정 보장]
 * 1. [상담/주차 희망 일자 (Date Picker)]를 배치하여 상담사가 캘린더 표시 일자를 직접 자유롭게 선택 저장.
 * 2. [최초 접수일자 & 최종 저장일자 (수정자)] 타임스탬프 바를 명시하여 DB 데이터 혼선 방지.
 * 3. 담당자 이관/등록 및 저장 클릭 시 DB Upsert 즉시 전 파이프라인 100% 동기화.
 */

import React, { useState } from 'react';
import { 
  CheckCircle, UserCheck, ArrowRightLeft, PlusCircle, X, MessageSquare,
  Plus, Edit2, Trash2, Copy, Check
} from 'lucide-react';
import {
  Customer,
  ParkingSpot,
  SavedTemplate,
  AgentTask,
  Consultation,
  ConsultationStatus,
  InternalAgent,
} from '../../../backend/types';

import { CenterCustomerForm } from './CenterCustomerForm';
import { LeftInteractionPad } from './LeftInteractionPad';
import { RightTaskManager } from './RightTaskManager';

interface MainConsultationHubProps {
  customer: Customer;
  parkingSpots: ParkingSpot[];
  savedTemplates: SavedTemplate[];
  tasks: AgentTask[];
  consultations: Consultation[];
  activeConsultation: Consultation;
  currentAgentName: string;
  agents: InternalAgent[];
  notes: string;
  setNotes: (text: string) => void;
  onChangeCustomerField: (field: keyof Customer, value: any) => void;
  onSelectRecommendedParking: (spot: ParkingSpot) => void;
  onChangeStatus: (status: ConsultationStatus, subStatusReason?: string) => void;
  onChangeSubStatus: (subStatus: string) => void; // 세부 프로세스 단계 변경
  onChangeAssignedAgent?: (newAgentName: string) => void;
  onChangeHopeDate?: (newDate: string) => void;
  onAddTask: (title: string, dueDate: string) => void;
  onToggleTask: (taskId: string) => void;
  onSaveLog: (summaryText: string, hopeDate?: string, extras?: any) => void;
  onResetForm?: () => void;
  onSelectConsultation?: (consId: string) => void;
  onStartNewConsultation?: () => void;
  isExistingConsultation?: boolean;
  matchingSuggestion?: { customer: Customer; consultation?: Consultation } | null;
  onApplySuggestion?: () => void;
  onDismissSuggestion?: () => void;
  activeLocks?: Record<string, { agentName: string; lockedAt: number }>;
  onNavigateToKanban: () => void;
  onNavigateToTasksTab?: () => void;
  onDeleteTask?: (taskId: string) => void;
  onAddTemplate?: (title: string, content: string, createdBy: string) => void;
  onEditTemplate?: (templateId: string, title: string, content: string) => void;
  onDeleteTemplate?: (templateId: string) => void;
}

export const MainConsultationHub: React.FC<MainConsultationHubProps> = ({
  customer,
  parkingSpots,
  savedTemplates,
  tasks,
  consultations,
  activeConsultation,
  currentAgentName,
  agents,
  notes,
  setNotes,
  onChangeCustomerField,
  onSelectRecommendedParking,
  onChangeStatus,
  onChangeSubStatus,
  onChangeAssignedAgent,
  onChangeHopeDate,
  onAddTask,
  onToggleTask,
  onSaveLog,
  onResetForm,
  onSelectConsultation,
  onStartNewConsultation,
  isExistingConsultation,
  matchingSuggestion,
  onApplySuggestion,
  onDismissSuggestion,
  activeLocks,
  onNavigateToKanban,
  onNavigateToTasksTab,
  onDeleteTask,
  onAddTemplate,
  onEditTemplate,
  onDeleteTemplate,
}) => {
  const [userCategory, setUserCategory] = useState<'사용자' | '공유자'>('사용자');
  const [inquiryType, setInquiryType] = useState('주차장 위치 문의');
  const [parkingCategory, setParkingCategory] = useState('거주자 우선 주차구역');
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [hopeDateInput, setHopeDateInput] = useState<string>(
    activeConsultation?.hope_date || new Date().toISOString().slice(0, 10)
  );

  // 주차 매칭 정보 관련 로컬 상태 추가
  const [ownerPhone, setOwnerPhone] = useState<string>('');
  const [userPhone, setUserPhone] = useState<string>('');
  const [parkingStartDate, setParkingStartDate] = useState<string>(
    activeConsultation?.parking_start_date || ''
  );

  const prevConsultationIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (activeConsultation) {
      if (prevConsultationIdRef.current !== activeConsultation.id) {
        prevConsultationIdRef.current = activeConsultation.id;
        setInquiryType(activeConsultation.inquiry_type || '주차 문의');
        setUserCategory((activeConsultation.user_type as any) || '사용자');
        setParkingCategory(activeConsultation.parking_type || '월주차');
        setHopeDateInput(activeConsultation.hope_date || new Date().toISOString().slice(0, 10));
        setOwnerPhone(activeConsultation.owner_phone || '');
        setUserPhone(activeConsultation.user_phone || '');
        setParkingStartDate(activeConsultation.parking_start_date || '');
      }
    }
  }, [activeConsultation]);

  const assignedAgentName = activeConsultation?.agent_name || currentAgentName;
  const isMyConsultation = assignedAgentName === currentAgentName;
  const assignedAgentObject = agents.find((a) => a.agent_name === assignedAgentName);

  const [targetAgentSelection, setTargetAgentSelection] = useState(assignedAgentName);
  const activeTasks = tasks.filter((t) => t.consultation_id === activeConsultation.id);

  const handleSaveAndSubmit = () => {
    // 💡 주차 문의, 연장, 차량 변경 문의가 아니거나 값이 비어있는 경우 무조건 null 처리하여 DB 꼬임 방지
    const cleanStartDate = ((inquiryType === '주차 문의' || inquiryType === '연장' || inquiryType === '차량 변경') && parkingStartDate.trim()) ? parkingStartDate : null;

    onSaveLog(notes, hopeDateInput, {
      inquiry_type: inquiryType,
      user_type: userCategory,
      parking_type: parkingCategory,
      sub_status: activeConsultation?.sub_status || '접수', // 💡 누락되어있던 실시간 sub_status 전달 복구 (옵셔널 체이닝 추가로 신규작성 시 크래시 방지)
      owner_phone: userCategory === '공유자' ? (customer?.phone_number || null) : (ownerPhone || null),
      user_phone: userCategory === '사용자' ? (customer?.phone_number || null) : (userPhone || null),
      parking_start_date: cleanStartDate,
    });
    if (onChangeHopeDate) {
      onChangeHopeDate(hopeDateInput);
    }
    setSaveToast(`상담 내역 및 일자(${hopeDateInput})가 DB에 성공적으로 저장되었습니다.`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleConfirmAgentTransfer = (selectedAgent: string) => {
    if (onChangeAssignedAgent) {
      onChangeAssignedAgent(selectedAgent);
      setSaveToast(`🎉 본 상담건이 [${selectedAgent}] 상담사 계정에 성공적으로 등록/이관되었습니다.`);
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-2 md:p-4 font-sans">
      {saveToast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className={`p-4 rounded-2xl border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-sm transition-all ${
        isMyConsultation ? 'bg-blue-50/90 border-blue-200 text-blue-950' : 'bg-amber-50/90 border-amber-300 text-amber-950'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-sm text-white shadow-xs ${
            isMyConsultation ? 'bg-blue-600' : 'bg-amber-600'
          }`}>
            {assignedAgentName.slice(0, 1)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">현재 담당 상담사:</span>
              <strong className="text-sm font-bold text-slate-900">{assignedAgentName} 상담사</strong>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                isMyConsultation ? 'bg-blue-600 text-white' : 'bg-amber-600 text-white'
              }`}>
                {assignedAgentObject?.team_name || 'CS 1팀'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {isMyConsultation ? (
                <span className="text-blue-700 font-semibold">✓ 접속하신 로그인 계정({currentAgentName})의 담당건입니다.</span>
              ) : (
                <span className="text-amber-800 font-semibold">⚠️ 타 상담원({assignedAgentName})이 처리 중인 건입니다.</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200/60">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs">
            <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <select
              value={targetAgentSelection}
              onChange={(e) => setTargetAgentSelection(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer pr-1"
            >
              <option value={currentAgentName}>📥 {currentAgentName} (내 계정으로 가져오기)</option>
              {agents.filter((a) => a.agent_name !== currentAgentName).map((ag) => (
                <option key={ag.id} value={ag.agent_name}>➡️ {ag.agent_name} ({ag.team_name || 'CS팀'})에게 이관/등록</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => handleConfirmAgentTransfer(targetAgentSelection)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <ArrowRightLeft className="w-4 h-4" />
            담당자 이관/등록 실행
          </button>
        </div>
      </div>

      {/* Main Grid Layout (LEFT 8/12, RIGHT 4/12) */}
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        <section className="w-full xl:w-2/3 flex flex-col gap-6">
          <CenterCustomerForm
            customer={customer}
            parkingSpots={parkingSpots}
            onChangeCustomerField={onChangeCustomerField}
            onSelectRecommendedParking={onSelectRecommendedParking}
            onResetForm={onResetForm}
            userCategory={userCategory}
            setUserCategory={setUserCategory}
            inquiryType={inquiryType}
            setInquiryType={setInquiryType}
            parkingCategory={parkingCategory}
            setParkingCategory={setParkingCategory}
            ownerPhone={ownerPhone}
            setOwnerPhone={setOwnerPhone}
            userPhone={userPhone}
            setUserPhone={setUserPhone}
            parkingStartDate={parkingStartDate}
            setParkingStartDate={setParkingStartDate}
            isExistingConsultation={isExistingConsultation}
            onStartNewConsultation={onStartNewConsultation}
            matchingSuggestion={matchingSuggestion}
            onApplySuggestion={onApplySuggestion}
            onDismissSuggestion={onDismissSuggestion}
            consultations={consultations}
            activeLocks={activeLocks}
            currentConsultationId={activeConsultation?.id}
            currentAgentName={currentAgentName}
            onSelectConsultation={onSelectConsultation}
            agents={agents}
          />
          <LeftInteractionPad
            activeConsultation={{
              ...activeConsultation,
              inquiry_type: inquiryType
            }}
            isExistingConsultation={isExistingConsultation}
            assignedAgentName={assignedAgentName}
            notes={notes}
            setNotes={setNotes}
            hopeDateInput={hopeDateInput}
            setHopeDateInput={setHopeDateInput}
            onChangeStatus={onChangeStatus}
            onChangeSubStatus={onChangeSubStatus}
            onChangeHopeDate={onChangeHopeDate}
            onNavigateToKanban={onNavigateToKanban}
            onResetForm={onResetForm}
            setShowTemplateModal={setShowTemplateModal}
            handleSaveAndSubmit={handleSaveAndSubmit}
            setSaveToast={setSaveToast}
          />
        </section>

        <section className="w-full xl:w-1/3 flex flex-col gap-6">
          <RightTaskManager
            activeConsultation={activeConsultation}
            assignedAgentName={assignedAgentName}
            activeTasks={activeTasks}
            onAddTask={onAddTask}
            onToggleTask={onToggleTask}
            onDeleteTask={onDeleteTask}
            agents={agents}
            onNavigateToTasksTab={onNavigateToTasksTab}
            notes={notes}
            setNotes={setNotes}
          />
        </section>
      </div>

      {showTemplateModal && (
        <TemplateEditorModal
          savedTemplates={savedTemplates}
          onClose={() => setShowTemplateModal(false)}
          onAdd={onAddTemplate}
          onEdit={onEditTemplate}
          onDelete={onDeleteTemplate}
          onSelect={(text) => {
            setNotes((prev) => prev ? `${prev}\n\n${text}` : text);
            setShowTemplateModal(false);
          }}
          currentAgentName={currentAgentName}
        />
      )}

    </div>
  );
};

// 💾 고품격 자주 쓰는 개인 상용구/메모장 관리 서브 모달 컴포넌트
interface TemplateEditorModalProps {
  savedTemplates: SavedTemplate[];
  onClose: () => void;
  onAdd?: (title: string, content: string, createdBy: string) => void;
  onEdit?: (templateId: string, title: string, content: string) => void;
  onDelete?: (templateId: string) => void;
  onSelect: (content: string) => void;
  currentAgentName: string;
}

const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({
  savedTemplates,
  onClose,
  onAdd,
  onEdit,
  onDelete,
  onSelect,
  currentAgentName,
}) => {
  const [editorMode, setEditorMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim() || !contentInput.trim()) return;
    if (onAdd) {
      onAdd(titleInput.trim(), contentInput.trim(), currentAgentName);
    }
    setTitleInput('');
    setContentInput('');
    setEditorMode('list');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !titleInput.trim() || !contentInput.trim()) return;
    if (onEdit) {
      onEdit(editingId, titleInput.trim(), contentInput.trim());
    }
    setEditingId(null);
    setTitleInput('');
    setContentInput('');
    setEditorMode('list');
  };

  const startEdit = (e: React.MouseEvent, tmpl: SavedTemplate) => {
    e.stopPropagation();
    setEditingId(tmpl.id);
    setTitleInput(tmpl.template_title);
    setContentInput(tmpl.content || (tmpl as any).template_content || '');
    setEditorMode('edit');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 flex flex-col space-y-4 max-h-[85vh] animate-in fade-in duration-150" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b pb-3 border-slate-100 shrink-0">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            <span>자주 쓰는 상용구 / 메모장</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {editorMode === 'list' ? (
          <>
            <div className="flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 font-semibold">템플릿을 선택하여 메모장에 입력하거나 바로 복사하세요.</span>
              <button
                type="button"
                onClick={() => {
                  setTitleInput('');
                  setContentInput('');
                  setEditorMode('add');
                }}
                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>새 상용구 추가</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll space-y-2.5 pr-1 py-1 max-h-[50vh]">
              {savedTemplates.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  등록된 자주 쓰는 메모가 없습니다.<br />우측 상단 버튼을 눌러 나만의 템플릿을 추가해 보세요!
                </div>
              ) : (
                savedTemplates.map((tmpl) => {
                  const contentText = tmpl.content || (tmpl as any).template_content || '';
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => onSelect(contentText)}
                      className="p-3.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all cursor-pointer group flex flex-col gap-1 text-left relative"
                      title="클릭 시 상담 메모장에 삽입"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-slate-800 group-hover:text-indigo-700 transition-colors">
                          {tmpl.template_title}
                        </span>
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => handleCopy(e, contentText, tmpl.id)}
                            className="p-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 cursor-pointer"
                            title="클립보드 즉시 복사"
                          >
                            {copiedId === tmpl.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => startEdit(e, tmpl)}
                            className="p-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 cursor-pointer"
                            title="수정하기"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onDelete && confirm('정말 삭제하시겠습니까?')) {
                                onDelete(tmpl.id);
                              }
                            }}
                            className="p-1 rounded bg-white hover:bg-red-50 border border-slate-200 text-slate-400 hover:text-red-600 cursor-pointer"
                            title="삭제하기"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed whitespace-pre-wrap mt-1">
                        {contentText}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <form onSubmit={editorMode === 'add' ? handleAddSubmit : handleEditSubmit} className="space-y-4 text-xs">
            <h4 className="font-bold text-slate-800 text-xs">
              {editorMode === 'add' ? '✨ 자주 쓰는 새 상용구 추가' : '✏️ 상용구 편집'}
            </h4>
            <div className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">상용구 제목</label>
                <input
                  type="text"
                  required
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="예: 부재중 1차 안내 문자"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">상용구 문구 본문</label>
                <textarea
                  required
                  value={contentInput}
                  onChange={(e) => setContentInput(e.target.value)}
                  placeholder="전송 또는 메모장에 삽입할 상용구 본문을 작성하세요."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none h-32 resize-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditorMode('list')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer shadow-xs"
              >
                저장하기
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
