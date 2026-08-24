import React from 'react';
import { Download, Trash2 } from 'lucide-react';
import { Customer } from '../../../../backend/types';
import { maskTempCarNumber, maskTempPhoneNumber } from '../../../../lib/utils/normalize';

interface CustomerManagerTabProps {
  customers: Customer[];
  downloadCustomersCSV: () => void;
  onToggleBlacklist: (customerId: string) => void;
  onDeleteCustomer?: (customerId: string) => void;
}

export const CustomerManagerTab: React.FC<CustomerManagerTabProps> = ({
  customers,
  downloadCustomersCSV,
  onToggleBlacklist,
  onDeleteCustomer,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <h3 className="font-bold text-slate-900 text-xs">전체 고객 원장 명단 ({customers.length}명)</h3>
        <button
          onClick={downloadCustomersCSV}
          className="px-3 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          고객 원장 CSV 내보내기
        </button>
      </div>
      <div className="divide-y divide-slate-100 text-xs">
        {customers.map((c) => {
          const displayPhone = maskTempPhoneNumber(c.phone_number, '미등록', true);
          const displayCar = maskTempCarNumber(c.car_number, '미등록');

          return (
            <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <strong className="text-slate-900 font-mono">{displayPhone}</strong>
                  <span className="font-mono uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                    {displayCar}
                  </span>
                  {c.is_blacklist && (
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">
                      🔴 블랙리스트
                    </span>
                  )}
                </div>
                <p className="text-slate-500 mt-1">{c.special_note || '특이사항 없음'}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleBlacklist(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    c.is_blacklist
                      ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                  }`}
                >
                  {c.is_blacklist ? '블랙리스트 해제' : '🔴 블랙리스트 지정'}
                </button>

                {onDeleteCustomer && (
                  <button
                    onClick={() => {
                      if (window.confirm(`[고객 원장 삭제]\n연락처: ${displayPhone}\n차량번호: ${displayCar}\n\n이 고객 원장 데이터를 삭제하시겠습니까?\n삭제 시 이 고객과 연결된 모든 상담건도 함께 영향을 받습니다.`)) {
                        onDeleteCustomer(c.id);
                      }
                    }}
                    className="p-1.5 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white rounded-lg border border-red-200 transition-all cursor-pointer flex items-center justify-center"
                    title="고객 원장 영구 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
