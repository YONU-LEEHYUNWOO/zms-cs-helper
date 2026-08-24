import React, { useState } from 'react';
import { Plus, Trash2, Edit2, X } from 'lucide-react';
import { SavedTemplate } from '../../../../backend/types';

interface TemplateManagerTabProps {
  templates: SavedTemplate[];
  onAddTemplate: (title: string, content: string, createdBy: string) => void;
  onEditTemplate?: (templateId: string, title: string, content: string) => void;
  onDeleteTemplate: (templateId: string) => void;
  setAdminToast: (msg: string | null) => void;
}

export const TemplateManagerTab: React.FC<TemplateManagerTabProps> = ({
  templates,
  onAddTemplate,
  onEditTemplate,
  onDeleteTemplate,
  setAdminToast,
}) => {
  const [newTmplTitle, setNewTmplTitle] = useState('');
  const [newTmplContent, setNewTmplContent] = useState('');
  const [newTmplCreatedBy] = useState('이현우');
  
  // 편집 모드 관련 상태 추가
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleCreateTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTmplTitle.trim() || !newTmplContent.trim()) return;

    if (editingId) {
      if (onEditTemplate) {
        onEditTemplate(editingId, newTmplTitle.trim(), newTmplContent.trim());
      }
      setEditingId(null);
      setAdminToast('템플릿이 성공적으로 수정되었습니다.');
    } else {
      onAddTemplate(newTmplTitle.trim(), newTmplContent.trim(), newTmplCreatedBy);
      setAdminToast('새 템플릿이 등록되었습니다.');
    }
    
    setNewTmplTitle('');
    setNewTmplContent('');
    setTimeout(() => setAdminToast(null), 3000);
  };

  const startEdit = (t: SavedTemplate) => {
    setEditingId(t.id);
    setNewTmplTitle(t.template_title);
    setNewTmplContent(t.content || (t as any).template_content || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewTmplTitle('');
    setNewTmplContent('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b pb-3 border-slate-100">
          <Plus className="w-4 h-4 text-blue-600" />
          {editingId ? '✏️ 안내 템플릿 수정' : '안내 템플릿 신규 추가'}
        </h3>
        <form onSubmit={handleCreateTemplateSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">템플릿 제목</label>
            <input
              type="text"
              required
              value={newTmplTitle}
              onChange={(e) => setNewTmplTitle(e.target.value)}
              placeholder="예: 부래중 1차 안내"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">템플릿 문구 본문</label>
            <textarea
              required
              value={newTmplContent}
              onChange={(e) => setNewTmplContent(e.target.value)}
              placeholder="문구 입력 (#{car_number}, #{parking_name} 치환가능)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none h-32 resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer border border-slate-200"
              >
                취소
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-2xs"
            >
              {editingId ? '수정 내용 저장' : '템플릿 저장'}
            </button>
          </div>
        </form>
      </div>

      <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        <h3 className="font-bold text-slate-900 text-xs border-b pb-3 border-slate-100">
          등록된 발송 템플릿 목록 ({templates.length}건)
        </h3>
        <div className="max-h-[60vh] overflow-y-auto custom-scroll space-y-2.5 pr-1">
          {templates.map((t) => (
            <div key={t.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-start">
              <div>
                <h4 className="font-bold text-slate-900">{t.template_title}</h4>
                <p className="text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">{t.content || (t as any).template_content}</p>
              </div>
              <div className="flex items-center gap-1.5 ml-2">
                <button
                  onClick={() => startEdit(t)}
                  className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                  title="수정하기"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteTemplate(t.id)}
                  className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                  title="삭제하기"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
