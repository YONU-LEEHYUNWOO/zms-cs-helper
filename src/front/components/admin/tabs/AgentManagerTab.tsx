import React from 'react';
import { Trash2 } from 'lucide-react';
import { InternalAgent } from '../../../../backend/types';

interface AgentManagerTabProps {
  agents: InternalAgent[];
  onAddAgent: (agent: any) => void;
  onDeleteAgent: (agentId: string) => void;
  setAdminToast: (msg: string | null) => void;
}

export const AgentManagerTab: React.FC<AgentManagerTabProps> = ({
  agents,
  onDeleteAgent,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-900 text-xs">등록된 전체 상담원 명단 ({agents.length}명)</h3>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.map((ag) => (
            <div key={ag.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
              <div>
                <strong className="text-slate-900 text-sm font-bold flex items-center gap-1.5">
                  👤 {ag.agent_name}
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                    {ag.team_name || 'CS팀'}
                  </span>
                </strong>
                <p className="text-slate-500 font-mono text-[11px] mt-0.5">{ag.email || 'email 미등록'}</p>
              </div>

              <button
                onClick={() => onDeleteAgent(ag.id)}
                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
