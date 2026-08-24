import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase 환경 변수 로드 (Vercel 배포 미주입 대비 100% 안전 폴백 기본값 적용)
 */
const DEFAULT_SUPABASE_URL = 'https://jqtdlqisyzglfqhcisrj.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxdGRscWlzeXpnbGZxaGNpc3JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTIzMDAsImV4cCI6MjEwMTQ4ODMwMH0.HrTUH4NdqBj0C7OecdZWnjRwGXNokfnrWfl4H6GZgvk';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

/**
 * Supabase 연동 여부 확인 헬퍼
 * @returns Supabase API URL 및 Key가 설정되어 있는지 여부
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseKey && supabaseUrl !== 'YOUR_SUPABASE_URL');
};

/**
 * Supabase 싱글톤 클라이언트 객체 생성
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseKey)
  : null;
