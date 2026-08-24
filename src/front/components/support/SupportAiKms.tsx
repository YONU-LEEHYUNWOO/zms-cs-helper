/**
 * ZMS CS Helper - Support AI 및 KMS (지식 관리 시스템) & 주차장 마스터 요금표 조회 컴포넌트
 * 
 * [역할 및 기능]
 * - 상담 중 필요한 약관, 거주자 우선주차 응대 규정, 장애 처리 매뉴얼 AI 실시간 탐색.
 * - 주차장 마스터 리스트 & 요금표 카드 뷰 제공 (월주차/시간당 요금, 출입 차단기 자동 인식 등록 여부, 지원 차종).
 * - 원클릭 안내 문구 클립보드 복사 지원.
 */

import React, { useState } from 'react';
import { 
  Sparkles, Search, Building2, MapPin, DollarSign, 
  Car, ShieldCheck, Copy, CheckCircle2, FileText, ArrowRight 
} from 'lucide-react';
import { Consultation } from '../../../backend/types';
import { INITIAL_PARKING_SPOTS } from '../../../lib/constants';

interface SupportAiKmsProps {
  consultations: Consultation[];
}

export const SupportAiKms: React.FC<SupportAiKmsProps> = () => {
  const [query, setQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [copiedSpotId, setCopiedSpotId] = useState<string | null>(null);
  const [filterRegion, setFilterRegion] = useState<string>('전체');

  const handleSearchKms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (query.includes('부정') || query.includes('차단기') || query.includes('월주차')) {
      setAiAnswer(
        `[AI KMS 매뉴얼] "${query}" 관련 처리 규정:\n` +
        `1. 월주차 신규 등록건: 고객 입차 전 LPR 차량번호 자동인식 등록 완료 여부를 파악하고, 시작일(예: 8/17 월요일) 기준 결제 안내 링크를 발송합니다.\n` +
        `2. 차단기 미개방 시: 원격 차단기 개방 신호를 1회 송출하며, 차종이 대형/카니발일 경우 입차 진입 가능 구획(지상/B1)을 동시 안내하세요.`
      );
    } else {
      setAiAnswer(
        `[AI KMS 검색 결과] "${query}"에 관한 표준 매뉴얼: 거주자 우선 주차구역 부정주차 건 인입 시, 현장 사진 및 구획 번호를 확인 후 공유자에게 1차 연락을 시도합니다. 부재 시 대체 인근 주차 매물을 안내하세요.`
      );
    }
  };

  const copySpotInfo = (spot: typeof INITIAL_PARKING_SPOTS[0]) => {
    const text = `[주차장 안내] ${spot.name}\n- 위치: ${spot.address}\n- 요금: 시간당 ${spot.price_per_hour.toLocaleString()}원 (월주차 180,000원~)\n- 가능 차종: ${spot.allowed_car_types.join(', ')}\n- 차단기: LPR 자동번호인식 시스템 가동 중`;
    navigator.clipboard.writeText(text);
    setCopiedSpotId(spot.id);
    setTimeout(() => setCopiedSpotId(null), 2500);
  };

  const filteredSpots = filterRegion === '전체' 
    ? INITIAL_PARKING_SPOTS 
    : INITIAL_PARKING_SPOTS.filter(s => s.region.includes(filterRegion));

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6 font-sans">
      {/* 📌 Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            Support AI & 주차장 마스터 KMS (지식 관리 시스템)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            상담 중 필요한 주차장 요금표, 입차 규정, 차종 제한 및 AI 대응 매뉴얼을 원클릭으로 탐색합니다.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {['전체', '강남구', '마포구', '영등포구', '성동구'].map((reg) => (
            <button
              key={reg}
              type="button"
              onClick={() => setFilterRegion(reg)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterRegion === reg 
                  ? 'bg-blue-600 text-white shadow-2xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {reg}
            </button>
          ))}
        </div>
      </div>

      {/* 🔍 AI Search Box */}
      <form onSubmit={handleSearchKms} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-blue-600" />
          AI 매뉴얼 실시간 어시스턴트
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="예: 월주차 신규 등록 절차, 강남역 차단기 미개방, 카니발 대형차 입차 규정..."
              className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-all active:scale-98"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            질의하기
          </button>
        </div>
      </form>

      {/* 💡 AI Answer Box */}
      {aiAnswer && (
        <div className="bg-gradient-to-br from-indigo-50/90 to-blue-50/90 p-5 rounded-2xl border border-blue-200 shadow-xs space-y-2 animate-fade-in">
          <h3 className="text-xs font-bold text-indigo-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            AI 매뉴얼 응대 가이드
          </h3>
          <p className="text-xs text-indigo-950 leading-relaxed bg-white/90 p-4 rounded-xl border border-indigo-100 font-mono whitespace-pre-line shadow-2xs">
            {aiAnswer}
          </p>
        </div>
      )}

      {/* 🅿️ 주차장 리스트 & 요금표 카드 그리드 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            주차장 마스터 현황 및 요금표 ({filteredSpots.length}개 검색됨)
          </h3>
          <span className="text-xs text-slate-500 font-medium">LPR 차단기 및 월주차 등록 정보 매칭</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSpots.map((spot) => (
            <div 
              key={spot.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between gap-4 group"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                    {spot.name}
                  </h4>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px] rounded-md shrink-0">
                    차단기 자동인식
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{spot.address}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block">시간당 요금</span>
                    <span className="text-xs font-extrabold text-slate-900">
                      {spot.price_per_hour.toLocaleString()}원 / 시간
                    </span>
                  </div>
                  <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
                    <span className="text-[10px] font-bold text-blue-600 block">월주차 요금</span>
                    <span className="text-xs font-extrabold text-blue-950">
                      {spot.name.includes('220') ? '180,000원' : '150,000원~'} / 월
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <Car className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {spot.allowed_car_types.map((ct) => (
                    <span 
                      key={ct}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        ct === '카니발' || ct === 'RV' ? 'bg-amber-100 text-amber-900 font-extrabold' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {ct}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => copySpotInfo(spot)}
                className={`w-full py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                  copiedSpotId === spot.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {copiedSpotId === spot.id ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                    안내문구 복사 완료!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    안내 템플릿 복사
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
