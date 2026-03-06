'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GatePage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    setLoading(true);
    setError(false);

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      setError(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950">
      <form action={handleSubmit} className="w-80 space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white">ETF Canvas</h1>
          <p className="text-sm text-neutral-500 mt-1">비밀번호를 입력해주세요</p>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          autoFocus
          className={`w-full px-4 py-2.5 rounded-lg bg-neutral-900 border text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
            error ? 'border-red-500' : 'border-neutral-800'
          }`}
        />
        {error && <p className="text-xs text-red-400">비밀번호가 틀렸어요.</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-neutral-200 transition-colors disabled:opacity-40"
        >
          {loading ? '확인 중...' : '입장'}
        </button>
      </form>
    </div>
  );
}
