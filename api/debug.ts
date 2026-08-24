/**
 * /api/debug - Vercel 배포 환경에서의 연동 상태 실시간 진단 엔드포인트
 * 브라우저에서 직접 /api/debug 접속 시 Supabase, 환경 변수, CTI 접속 상태를 JSON으로 반환
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'NOT_SET';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'NOT_SET';
  const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'NOT_SET';
  const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || 'NOT_SET';

  // 1. Supabase 실제 연결 테스트
  let supabaseStatus = 'NOT_TESTED';
  let agentCount = -1;
  let taskCount = -1;
  let supabaseError = '';

  const usedKey = serviceKey !== 'NOT_SET' ? serviceKey : (anonKey !== 'NOT_SET' ? anonKey : 'FALLBACK_HARDCODED');
  const usedUrl = supabaseUrl !== 'NOT_SET' ? supabaseUrl : 'https://jqtdlqisyzglfqhcisrj.supabase.co';
  const hardcodedAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxdGRscWlzeXpnbGZxaGNpc3JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTIzMDAsImV4cCI6MjEwMTQ4ODMwMH0.HrTUH4NdqBj0C7OecdZWnjRwGXNokfnrWfl4H6GZgvk';
  const resolvedKey = usedKey === 'FALLBACK_HARDCODED' ? hardcodedAnonKey : usedKey;
  const resolvedUrl = usedUrl;

  try {
    // agent 테이블 조회 테스트
    const agentRes = await fetch(`${resolvedUrl}/rest/v1/internal_agents?select=id&limit=50`, {
      headers: {
        'apikey': resolvedKey,
        'Authorization': `Bearer ${resolvedKey}`,
        'Content-Type': 'application/json',
      }
    });
    if (agentRes.ok) {
      const agents = await agentRes.json();
      agentCount = Array.isArray(agents) ? agents.length : -1;
      supabaseStatus = 'OK';
    } else {
      const body = await agentRes.text();
      supabaseStatus = `FAIL_HTTP_${agentRes.status}`;
      supabaseError = body;
    }

    // task 테이블 조회 테스트
    const taskRes = await fetch(`${resolvedUrl}/rest/v1/agent_tasks?select=id&limit=50`, {
      headers: {
        'apikey': resolvedKey,
        'Authorization': `Bearer ${resolvedKey}`,
        'Content-Type': 'application/json',
      }
    });
    if (taskRes.ok) {
      const tasks = await taskRes.json();
      taskCount = Array.isArray(tasks) ? tasks.length : -1;
    }
  } catch (e: any) {
    supabaseStatus = 'ERROR';
    supabaseError = e?.message || String(e);
  }

  // 2. CTI 서버 접속 테스트
  let ctiStatus = 'NOT_TESTED';
  try {
    const ctiRes = await fetch('http://202.30.232.240/index.jsp', {
      signal: AbortSignal.timeout(5000)
    });
    ctiStatus = ctiRes.ok ? `OK_HTTP_${ctiRes.status}` : `FAIL_HTTP_${ctiRes.status}`;
  } catch (e: any) {
    ctiStatus = `ERROR: ${e?.message || String(e)}`;
  }

  return res.status(200).json({
    timestamp: new Date().toISOString(),
    env: {
      VITE_SUPABASE_URL: supabaseUrl,
      VITE_SUPABASE_ANON_KEY: anonKey !== 'NOT_SET' ? `SET (${anonKey.slice(0, 20)}...)` : 'NOT_SET',
      VITE_SUPABASE_SERVICE_ROLE_KEY: serviceKey !== 'NOT_SET' ? `SET (${serviceKey.slice(0, 20)}...)` : 'NOT_SET',
      GEMINI_API_KEY: geminiKey !== 'NOT_SET' ? `SET (${geminiKey.slice(0, 20)}...)` : 'NOT_SET',
    },
    resolved: {
      supabaseUrl: resolvedUrl,
      keyUsed: resolvedKey === hardcodedAnonKey ? 'FALLBACK_HARDCODED_ANON' : (usedKey === serviceKey ? 'SERVICE_ROLE' : 'ANON'),
    },
    supabase: {
      status: supabaseStatus,
      agentCount,
      taskCount,
      error: supabaseError || null,
    },
    cti: {
      status: ctiStatus,
    },
  });
}
