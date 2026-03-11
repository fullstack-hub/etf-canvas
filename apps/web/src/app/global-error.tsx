'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>문제가 발생했어요</h2>
          <p style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>{error.message || '알 수 없는 오류'}</p>
          <button onClick={reset} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', cursor: 'pointer', fontSize: 13 }}>
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
