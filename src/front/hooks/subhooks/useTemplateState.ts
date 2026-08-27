/**
 * ZMS CS Helper - 상용 문자 템플릿 전용 Sub-Hook (useTemplateState)
 * 
 * [역할 및 아키텍처 위치]
 * - src/front/hooks/subhooks/useTemplateState.ts
 * - 템플릿 목록 상태 관리 및 로컬스토리지 동기화 CRUD
 */

import { useState, useCallback } from 'react';
import { SavedTemplate } from '../../../backend/types';

export function useTemplateState() {
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);

  const handleAddTemplate = useCallback((title: string, content: string, createdBy: string) => {
    const newTmpl: SavedTemplate = {
      id: `tmpl-${Date.now()}`,
      template_title: title,
      content,
      created_by: createdBy,
    };
    setTemplates((prev) => {
      const next = [...prev, newTmpl];
      localStorage.setItem('local_saved_templates', JSON.stringify(next));
      return next;
    });
  }, []);

  const handleEditTemplate = useCallback((templateId: string, title: string, content: string) => {
    setTemplates((prev) => {
      const next = prev.map((t) => (t.id === templateId ? { ...t, template_title: title, content } : t));
      localStorage.setItem('local_saved_templates', JSON.stringify(next));
      return next;
    });
  }, []);

  const handleDeleteTemplate = useCallback((templateId: string) => {
    setTemplates((prev) => {
      const next = prev.filter((t) => t.id !== templateId);
      localStorage.setItem('local_saved_templates', JSON.stringify(next));
      return next;
    });
  }, []);

  return {
    templates,
    setTemplates,
    handleAddTemplate,
    handleEditTemplate,
    handleDeleteTemplate,
  };
}
