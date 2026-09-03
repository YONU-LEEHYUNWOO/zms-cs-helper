/**
 * ZMS CS Helper - 상담원 보안 로그인/회원가입 모달 컴포넌트
 * 
 * [설명] Supabase 클라우드 Auth와 연동하여 실제 로그인 및 회원가입 처리를 담당합니다.
 */

import React, { useState } from 'react';
import { Lock, Mail, KeyRound, AlertCircle, X, CheckCircle, UserPlus, LogIn } from 'lucide-react';
import { supabase } from '../../../lib/supabase/client';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  isMandatory?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  isMandatory = false,
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nameInput, setNameInput] = useState(''); // 회원가입 시 이름
  const [teamInput, setTeamInput] = useState('CS 1팀'); // 회원가입 시 소속 팀
  const [extInput, setExtInput] = useState(''); // 회원가입 시 CTI 내선 번호
  const [phoneInput, setPhoneInput] = useState(''); // 회원가입 시 직통 연락처

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 이메일 링크를 통해 비밀번호 재설정 토큰 해시가 주소창에 존재하는지 탐지하여 즉시 reset 모드로 전환
  React.useEffect(() => {
    const checkRecoveryHash = () => {
      const hash = window.location.hash || '';
      // Supabase 복구 이메일 클릭 시 access_token 과 함께 type=recovery 가 해시에 포함되어 리턴됩니다.
      if (hash.includes('access_token') || hash.includes('type=recovery')) {
        setMode('reset');
      }
    };
    
    checkRecoveryHash();

    // supabase 인증 리스너를 보조로 두어 type=PASSWORD_RECOVERY 이벤트를 잡습니다.
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setMode('reset');
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    if (!supabase) {
      setErrorMessage('Supabase 클라이언트가 초기화되지 않았습니다. .env 연동을 확인하세요.');
      setIsLoading(false);
      return;
    }

    try {
      if (mode === 'signup') {
        // 1. 회원가입 프로세스
        if (passwordInput !== passwordConfirm) {
          throw new Error('비밀번호가 일치하지 않습니다.');
        }
        if (!nameInput.trim()) {
          throw new Error('상담원 실명을 입력해주세요.');
        }

        if (passwordInput.length < 6) {
          throw new Error('비밀번호는 최소 6자리 이상이어야 합니다.');
        }

        // Supabase 회원가입 (이름, 팀, 내선, 연락처를 user_metadata에 저장)
        const { data, error } = await supabase.auth.signUp({
          email: emailInput.trim(),
          password: passwordInput,
          options: {
            data: {
              agent_name: nameInput.trim(),
              team_name: teamInput.trim() || 'CS 1팀',
              extension_number: extInput.trim(),
              phone_number: phoneInput.trim(),
            }
          }
        });

        if (error) throw error;

        // 회원가입 성공 시 마스터 테이블 (internal_agents)에 동기화 저장 및 로컬스토리지 백업
        if (data.user) {
          const newAgentObj = {
            id: data.user.id,
            agent_name: nameInput.trim(),
            email: emailInput.trim().toLowerCase(),
            role: 'AGENT' as const,
            team_name: teamInput.trim() || 'CS 1팀',
            extension_number: extInput.trim(),
            phone_number: phoneInput.trim(),
            agent_status: '활성화' as const
          };

          localStorage.setItem(`zms_agent_profile_${data.user.id}`, JSON.stringify(newAgentObj));

          const { error: dbError } = await supabase
            .from('internal_agents')
            .upsert([newAgentObj]);
            
          if (dbError && dbError.code !== '23505') {
            console.warn('Agent DB Insert Error:', dbError);
          }
        }

        // 가입 성공 후 즉시 로그인 세션이 생성되었거나 자동 로그인 시도
        if (data.session) {
          setSuccessMessage('🎉 회원가입 및 보안 로그인이 완수되었습니다! 즉시 메인 서비스로 진입합니다.');
          setTimeout(() => {
            onLoginSuccess();
            onClose();
          }, 800);
        } else {
          // 자동 로그인 시도
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: emailInput.trim(),
            password: passwordInput,
          });

          if (!signInErr && signInData.session) {
            setSuccessMessage('🎉 회원가입 및 보안 로그인이 완수되었습니다!');
            setTimeout(() => {
              onLoginSuccess();
              onClose();
            }, 800);
          } else {
            setSuccessMessage('🎉 회원가입 요청이 성공적으로 접수되었습니다! 이메일 주소와 비밀번호로 로그인해 주세요.');
            setMode('login');
          }
        }

      } else if (mode === 'forgot') {
        // 2. 비밀번호 재설정 이메일 전송 프로세스
        if (!emailInput.trim()) {
          throw new Error('이메일 주소를 입력해 주세요.');
        }
        const { error } = await supabase.auth.resetPasswordForEmail(emailInput.trim(), {
          redirectTo: `${window.location.origin}/`,
        });
        if (error) throw error;

        setSuccessMessage('📧 비밀번호 재설정 링크가 입력하신 이메일로 발송되었습니다. 편지함을 확인해 주세요.');
        setMode('login');

      } else if (mode === 'reset') {
        // 3. 신규 비밀번호 변경 프로세스 (이메일 토큰 진입용)
        if (passwordInput !== passwordConfirm) {
          throw new Error('비밀번호가 일치하지 않습니다.');
        }
        if (passwordInput.length < 6) {
          throw new Error('비밀번호는 최소 6자리 이상이어야 합니다.');
        }

        const { error } = await supabase.auth.updateUser({
          password: passwordInput,
        });
        if (error) throw error;

        setSuccessMessage('✨ 비밀번호가 안전하게 변경되었습니다! 새로운 패스워드로 로그인해 주세요.');
        setMode('login');
        setPasswordInput('');
        setPasswordConfirm('');
        // 해시토큰 제거하여 새로고침 시 초기화
        window.history.replaceState(null, '', window.location.pathname);

      } else {
        // 4. 로그인 프로세스
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailInput.trim(),
          password: passwordInput,
        });

        if (error) throw error;
        
        if (data.session) {
          onLoginSuccess();
          onClose();
        }
      }
    } catch (err: any) {
      const rawMessage: string = err.message || '';
      console.warn('Auth Process Warning:', rawMessage);
      
      if (rawMessage.toLowerCase().includes('user already registered') || rawMessage.toLowerCase().includes('already exists')) {
        // 이미 등록된 유저인 경우 로그인 시도
        try {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: emailInput.trim(),
            password: passwordInput,
          });
          if (!signInErr && signInData.session) {
            setSuccessMessage('🎉 이미 등록된 계정입니다. 해당 패스워드로 로그인이 완료되었습니다!');
            setTimeout(() => {
              onLoginSuccess();
              onClose();
            }, 800);
            return;
          }
        } catch (_) {}
        setErrorMessage('이미 사내 명단에 등록된 이메일입니다. [로그인] 탭으로 이동하시어 등록하신 비밀번호로 로그인해 주세요.');
        setMode('login');
      } else if (rawMessage.toLowerCase().includes('email not confirmed')) {
        setErrorMessage('이메일 인증이 완수되지 않았습니다. 메일함을 확인하시거나 관리자에게 문의해 주세요.');
      } else if (rawMessage.toLowerCase().includes('invalid login credentials')) {
        setErrorMessage('이메일 또는 비밀번호가 올바르지 않습니다. 다시 확인해 주세요.');
      } else if (rawMessage.toLowerCase().includes('unable to validate email') || rawMessage.toLowerCase().includes('invalid email')) {
        setErrorMessage('올바른 이메일 형식이 아닙니다 (예: name@zoomansa.com).');
      } else {
        setErrorMessage(rawMessage || '인증 처리 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans" onClick={isMandatory ? undefined : onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 relative" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md">
              Z
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {mode === 'login' && 'ZMS CS 상담원 로그인'}
                {mode === 'signup' && '신규 상담원 가입 (Sign Up)'}
                {mode === 'forgot' && '비밀번호 재설정 요청'}
                {mode === 'reset' && '🔑 신규 비밀번호 설정'}
              </h2>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                {isMandatory ? (
                  <span className="text-blue-600 font-bold flex items-center gap-1"><Lock className="w-3 h-3 text-blue-600" /> 클라우드 보안 인증 접속 필수 (로그인 필요)</span>
                ) : (
                  '클라우드 중앙 DB 보안 인증 접속'
                )}
              </p>
            </div>
          </div>
          {!isMandatory && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {mode === 'signup' && (
            <div className="space-y-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
              <div className="space-y-1">
                <label className="text-xs text-slate-700 font-bold block">상담원 실명 (DB 표기 이름) *</label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="예: 홍길동 (필수)"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-600 font-semibold block">소속 부서 / 팀</label>
                  <select
                    value={teamInput}
                    onChange={(e) => setTeamInput(e.target.value)}
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="CS 1팀">CS 1팀</option>
                    <option value="CS 2팀">CS 2팀</option>
                    <option value="전담 대응팀">전담 대응팀</option>
                    <option value="VIP 관리팀">VIP 관리팀</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-600 font-semibold block">CTI 내선 번호</label>
                  <input
                    type="text"
                    value={extInput}
                    onChange={(e) => setExtInput(e.target.value)}
                    placeholder="예: 7167"
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-600 font-semibold block">직통 연락처 (휴대폰)</label>
                <input
                  type="text"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="예: 010-1234-5678"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          )}

          {mode !== 'reset' && (
            <div className="space-y-1.5">
              <label className="text-xs text-slate-600 font-semibold block">이메일 주소</label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="email@zms.co.kr"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                />
              </div>
            </div>
          )}

          {mode !== 'forgot' && (
            <div className="space-y-1.5">
              <label className="text-xs text-slate-600 font-semibold block">
                {mode === 'reset' ? '새로운 비밀번호 (6자리 이상)' : '비밀번호'}
              </label>
              <div className="relative flex items-center">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="비밀번호를 입력하세요..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                />
              </div>
            </div>
          )}

          {(mode === 'signup' || mode === 'reset') && (
            <div className="space-y-1.5">
              <label className="text-xs text-slate-600 font-semibold block">비밀번호 확인</label>
              <div className="relative flex items-center">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? '요청 처리 중...' : (
              <>
                {mode === 'login' && <><LogIn className="w-4 h-4" /> 로그인 및 워크스페이스 접속</>}
                {mode === 'signup' && <><UserPlus className="w-4 h-4" /> 상담사 계정 등록</>}
                {mode === 'forgot' && <><Mail className="w-4 h-4" /> 재설정 이메일 링크 발송</>}
                {mode === 'reset' && <><KeyRound className="w-4 h-4" /> 비밀번호 업데이트 적용</>}
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="pt-4 border-t border-slate-100 flex flex-col items-center gap-2.5">
          {mode === 'login' && (
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setSuccessMessage(null);
                setMode('forgot');
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              🔒 비밀번호를 분실하셨나요? (비밀번호 찾기)
            </button>
          )}
          
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setSuccessMessage(null);
              setMode(mode === 'login' ? 'signup' : 'login');
            }}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
          >
            {mode === 'login' && '처음 오셨나요? 신규 상담사 가입하기'}
            {mode !== 'login' && '이미 계정이 있으신가요? 로그인 화면으로 돌아가기'}
          </button>
        </div>
      </div>
    </div>
  );
};

