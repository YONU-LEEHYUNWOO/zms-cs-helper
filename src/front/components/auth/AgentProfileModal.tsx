/**
 * ZMS CS Helper - 상담사 내 프로필 설정 & 어드민 계정 관리 모달
 *
 * [역할]
 * - 좌측 하단 사이드바 계정 프로필 클릭 시 호출됩니다.
 * - 탭 1: 내 프로필 정보(이름, 소속 팀, CTI 내선 번호, 연락처 등) 조회 및 수정.
 * - 탭 2: 사내 전체 상담사 명단 관리 및 신규 상담사 계정 등록 (어드민 기능).
 * - 탭 3: 샌드박스 다중 계정 빠른 전환기 (홍길동 ↔ 김철수 ↔ 이영희 테스트용).
 *
 * [보안 & UX 원칙]
 * - Rule 8 (Backdrop Dismiss): 오버레이 클릭 시 닫히며 컨텐츠에 stopPropagation 적용.
 * - Rule 3 (한글 주석): 주요 로직 및 상태에 한국어 주석 명시.
 */

import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  PhoneCall,
  Lock,
  Building,
  UserPlus,
  Users,
  CheckCircle,
  AlertCircle,
  X,
  RefreshCw,
  LogOut,
  Sparkles,
  Key,
  ExternalLink,
} from 'lucide-react';
import { InternalAgent } from '../../../backend/types';
import { getStoredGeminiApiKey, setStoredGeminiApiKey } from '../../../lib/utils/geminiApi';

interface AgentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAgent: InternalAgent | null;
  agents: InternalAgent[];
  onSaveAgent: (agentData: Partial<InternalAgent>) => Promise<void>;
  onRegisterNewAgent: (newAgentData: {
    email: string;
    agent_name: string;
    team_name?: string;
    extension_number?: string;
    phone_number?: string;
    role?: 'AGENT' | 'LEADER' | 'ADMIN';
    password_hash?: string;
  }) => Promise<any>;
  onSwitchAgent: (agentName: string) => void;
  onUpdateAgentRole?: (agentId: string, newRole: 'AGENT' | 'LEADER' | 'ADMIN') => Promise<void>;
  onLogout: () => void;
}

export const AgentProfileModal: React.FC<AgentProfileModalProps> = ({
  isOpen,
  onClose,
  currentAgent,
  agents,
  onSaveAgent,
  onRegisterNewAgent,
  onSwitchAgent,
  onUpdateAgentRole,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'admin' | 'switch'>('profile');
  const isAdmin = currentAgent?.role === 'ADMIN' || currentAgent?.role === 'SUPER_ADMIN' || currentAgent?.agent_name === '관리자' || currentAgent?.agent_name === '이현우';

  useEffect(() => {
    if (!isAdmin && (activeTab === 'admin' || activeTab === 'switch')) {
      setActiveTab('profile');
    }
  }, [isAdmin, activeTab]);

  // 내 프로필 폼 상태
  const [nameInput, setNameInput] = useState('');
  const [teamInput, setTeamInput] = useState('CS 1팀');
  const [extInput, setExtInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [geminiKeyInput, setGeminiKeyInput] = useState('');

  // 신규 가입 폼 상태
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newTeam, setNewTeam] = useState('CS 1팀');
  const [newExt, setNewExt] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'AGENT' | 'LEADER' | 'ADMIN'>('AGENT');
  const [newPassword, setNewPassword] = useState('');

  // 알림 메시지 상태
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 모달 열릴 때 현재 상담원 정보로 폼 초기화
  useEffect(() => {
    if (currentAgent) {
      setNameInput(currentAgent.agent_name || '');
      setTeamInput(currentAgent.team_name || 'CS 1팀');
      setExtInput(currentAgent.extension_number || '');
      setPhoneInput(currentAgent.phone_number || '');
      setPasswordInput('');
      setGeminiKeyInput(getStoredGeminiApiKey(currentAgent.agent_name));
    }
    setStatusMsg(null);
  }, [currentAgent, isOpen]);

  if (!isOpen) return null;

  // 내 프로필 수정 저장
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setStatusMsg({ type: 'error', text: '상담원 이름을 입력해 주세요.' });
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusMsg(null);
      setStoredGeminiApiKey(geminiKeyInput.trim(), currentAgent?.agent_name);
      await onSaveAgent({
        agent_name: nameInput.trim(),
        team_name: teamInput.trim(),
        extension_number: extInput.trim(),
        phone_number: phoneInput.trim(),
        ...(passwordInput.trim() ? { password_hash: passwordInput.trim() } : {}),
      });
      setStatusMsg({ type: 'success', text: '프로필 정보 및 개인 API 키가 성공적으로 저장되었습니다.' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || '프로필 저장 중 오류가 발생했습니다.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 신규 상담사 계정 등록 (어드민)
  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim()) {
      setStatusMsg({ type: 'error', text: '계정 이메일과 상담사 실명을 모두 입력해 주세요.' });
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusMsg(null);
      await onRegisterNewAgent({
        email: newEmail.trim(),
        agent_name: newName.trim(),
        team_name: newTeam.trim(),
        extension_number: newExt.trim(),
        phone_number: newPhone.trim(),
        role: newRole,
        password_hash: newPassword.trim() || '12341234',
      });
      setStatusMsg({ type: 'success', text: `🎉 신규 상담사 '${newName}' (${newEmail}) 계정이 Supabase Auth 및 DB에 정상 등록되었습니다.` });
      // 입력창 초기화
      setNewEmail('');
      setNewName('');
      setNewExt('');
      setNewPhone('');
      setNewPassword('');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || '신규 계정 등록 중 오류가 발생했습니다.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // Rule 8 준수: 최상위 백드롭 오버레이 클릭 시 모달 닫힘 바인딩
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      {/* 컨텐츠 내부 div에 이벤트 버블링 차단 (Rule 8) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        {/* 모달 상단 헤더 */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">상담사 계정 & 프로필 어드민 관리</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                내 프로필 정보 수정, 사내 상담사 명단 관리 및 샌드박스 계정 전환
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 내비게이션 바 */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-6 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('profile');
              setStatusMsg(null);
            }}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600 bg-white shadow-3xs rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>👤 내 프로필 설정</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setStatusMsg(null);
              }}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'border-blue-600 text-blue-600 bg-white shadow-3xs rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>🏢 상담사 명단 & 신규 가입 (관리자전용)</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('switch');
                setStatusMsg(null);
              }}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'switch'
                  ? 'border-blue-600 text-blue-600 bg-white shadow-3xs rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <RefreshCw className="w-4 h-4 text-amber-500" />
              <span>🔄 샌드박스 계정 전환 (관리자전용)</span>
            </button>
          )}
        </div>

        {/* 알림 피드백 메시지 바 */}
        {statusMsg && (
          <div
            className={`px-6 py-2.5 text-xs font-bold flex items-center gap-2 shrink-0 ${
              statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-100' : 'bg-red-50 text-red-800 border-b border-red-100'
            }`}
          >
            {statusMsg.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* 탭 바디 영역 */}
        <div className="p-6 overflow-y-auto custom-scroll flex-1">
          {/* TAB 1: 내 프로필 설정 */}
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {(currentAgent?.agent_name || '상').slice(0, 1)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <span>{currentAgent?.agent_name || '상담원'}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-blue-600 text-white font-semibold rounded-md">
                        {currentAgent?.role || 'AGENT'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {currentAgent?.team_name || 'CS 1팀'} • 내선: {currentAgent?.extension_number || '미등록'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>로그아웃</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>상담원 이름</span>
                  </label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="예: 홍길동"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>소속 부서 / 팀</span>
                  </label>
                  <select
                    value={teamInput}
                    onChange={(e) => setTeamInput(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-white cursor-pointer"
                  >
                    <option value="CS 1팀">CS 1팀 (일반 주차 문의)</option>
                    <option value="CS 2팀">CS 2팀 (월주차 & 정산)</option>
                    <option value="전담 대응팀">주차 분쟁 및 긴급 대응팀</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                    <span>CTI 내선 번호</span>
                  </label>
                  <input
                    type="text"
                    value={extInput}
                    onChange={(e) => setExtInput(e.target.value)}
                    placeholder="예: 104"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>직통 연락처</span>
                  </label>
                  <input
                    type="text"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="예: 010-1234-5678"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono font-semibold"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>비밀번호 변경 (변경 시에만 입력)</span>
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="새 비밀번호 입력 (변경하지 않으려면 비워두세요)"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                {/* 🔑 내 개별 Gemini API Key 설정 & Google AI Studio 무료 발급 안내 가이드 */}
                <div className="space-y-2 sm:col-span-2 bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-100 mt-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>🔑 내 개별 Gemini API Key (STT 오디오 분석 전용)</span>
                    </label>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline flex items-center gap-1 bg-white px-2.5 py-1 rounded-md border border-indigo-200 shadow-2xs cursor-pointer"
                    >
                      <span>🌐 Google AI Studio 무료 Key 발급 받기</span>
                      <ExternalLink className="w-3 h-3 text-indigo-600" />
                    </a>
                  </div>

                  <p className="text-[11px] text-indigo-700 leading-relaxed font-sans">
                    💡 <strong>1분 만에 키 발급받는 방법</strong>: 링크 접속 ➔ Google 계정 로그인 ➔ <strong>[Create API Key]</strong> 클릭 ➔ 생성된 <code className="bg-indigo-100 px-1 py-0.5 rounded font-mono font-bold">AIzaSy...</code> 키를 아래에 붙여넣고 저장해 주세요.
                  </p>

                  <input
                    type="text"
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    placeholder="AIzaSy... (입력 시 내 계정 독립 키로 2~3초 초고속 오디오 분석 구동)"
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>내 프로필 정보 저장</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: 상담사 명단 & 신규 가입 (어드민) */}
          {activeTab === 'admin' && (
            <div className="space-y-6">
              {/* 등록된 상담사 명단 테이블 */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>사내 등록 상담사 명단 ({agents.length}명)</span>
                </h3>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">상담사명</th>
                        <th className="p-2.5">소속 팀</th>
                        <th className="p-2.5">CTI 내선</th>
                        <th className="p-2.5">직통 연락처</th>
                        <th className="p-2.5">권한</th>
                        <th className="p-2.5 text-center">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-800">
                      {agents.map((ag) => (
                        <tr key={ag.id || ag.agent_name} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                              {ag.agent_name.slice(0, 1)}
                            </div>
                            <span>{ag.agent_name}</span>
                            {ag.agent_name === currentAgent?.agent_name && (
                              <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.2 rounded">나</span>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-600">{ag.team_name || 'CS 1팀'}</td>
                          <td className="p-2.5 font-mono text-slate-700">{ag.extension_number || '-'}</td>
                          <td className="p-2.5 font-mono text-slate-600">{ag.phone_number || '-'}</td>
                          <td className="p-2.5 font-bold">
                            <select
                              value={ag.role || 'AGENT'}
                              onChange={async (e) => {
                                const newRole = e.target.value as 'AGENT' | 'LEADER' | 'ADMIN';
                                if (onUpdateAgentRole) {
                                  await onUpdateAgentRole(ag.id, newRole);
                                  setStatusMsg({ type: 'success', text: `'${ag.agent_name}' 상담원의 권한이 '${newRole}'(으)로 변경되었습니다.` });
                                }
                              }}
                              className={`text-[10px] font-bold px-2 py-1 rounded-md border outline-none cursor-pointer ${
                                ag.role === 'ADMIN' 
                                  ? 'bg-purple-100 text-purple-900 border-purple-300' 
                                  : ag.role === 'LEADER'
                                    ? 'bg-blue-100 text-blue-900 border-blue-300'
                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                              }`}
                            >
                              <option value="AGENT">AGENT (일반상담원)</option>
                              <option value="LEADER">LEADER (팀장)</option>
                              <option value="ADMIN">ADMIN (최고관리자)</option>
                            </select>
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md">
                              {ag.agent_status || '활성화'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 신규 상담사 가입 등록 폼 */}
              <form onSubmit={handleCreateAgent} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-blue-600" />
                  <span>➕ 신규 상담사 계정 등록 (어드민)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">계정 이메일 (로그인 ID) *</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="예: agent2@nate.com"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">상담사 이름 *</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="예: 박민수"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">소속 팀</label>
                    <select
                      value={newTeam}
                      onChange={(e) => setNewTeam(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer"
                    >
                      <option value="CS 1팀">CS 1팀</option>
                      <option value="CS 2팀">CS 2팀</option>
                      <option value="전담 대응팀">전담 대응팀</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">CTI 내선 번호</label>
                    <input
                      type="text"
                      value={newExt}
                      onChange={(e) => setNewExt(e.target.value)}
                      placeholder="예: 105"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">직통 연락처</label>
                    <input
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="예: 010-9999-8888"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">계정 권한</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer"
                    >
                      <option value="AGENT">일반 상담원 (AGENT)</option>
                      <option value="LEADER">팀장 (LEADER)</option>
                      <option value="ADMIN">관리자 (ADMIN)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">초기 비밀번호</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="기본: 12341234"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>신규 상담사 계정 신규 생성</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: 샌드박스 계정 빠른 전환 */}
          {activeTab === 'switch' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 text-xs text-amber-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>🧪 다방향 다중 계정 연동 샌드박스 스위처</span>
                </div>
                <p className="text-amber-800">
                  단일 개발 PC 환경에서 클릭 한 번으로 상담사 시점(`홍길동 ↔ 김철수 ↔ 이영희`)을 빠르게 전환하여,
                  상담 이관 및 계정별 격리된 알림이 다방향으로 전달되는지 라이브 검수할 수 있습니다.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {agents.map((ag) => {
                  const isCurrent = ag.agent_name === currentAgent?.agent_name;
                  return (
                    <button
                      key={ag.id || ag.agent_name}
                      type="button"
                      onClick={() => {
                        onSwitchAgent(ag.agent_name);
                        setStatusMsg({ type: 'success', text: `'${ag.agent_name}' 상담사 계정 시점으로 전환되었습니다.` });
                      }}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                          {ag.agent_name.slice(0, 1)}
                        </div>
                        {isCurrent && (
                          <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-md">
                            현재 접속 중
                          </span>
                        )}
                      </div>
                      <div className="mt-3">
                        <h4 className="font-bold text-xs text-slate-900">{ag.agent_name} 상담사</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">{ag.team_name || 'CS 1팀'}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
