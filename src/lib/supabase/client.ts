import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase 환경 변수 로드
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
// 💡 Vite 빌드 특성상 클라이언트 브라우저 단에서 노출하여 읽기 위해 VITE_ prefix 키를 맵핑합니다.
const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Supabase 연동 여부 확인 헬퍼
 * @returns Supabase API URL 및 Key가 설정되어 있는지 여부
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseKey && supabaseUrl !== 'YOUR_SUPABASE_URL');
};

/**
 * Supabase 싱글톤 클라이언트 객체 생성 (비활성화 시 null)
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseKey)
  : null;
