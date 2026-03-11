'use client';

import { signIn } from 'next-auth/react';

export function LoginModal({ onClose }: { onClose: () => void }) {
  const login = (hint: string) =>
    signIn('keycloak', { redirectTo: '/' }, { kc_idp_hint: hint });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-background rounded-2xl border shadow-2xl w-[360px] p-8 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>

        <div className="text-center mb-6">
          <h2 className="text-lg font-bold">로그인이 필요해요</h2>
          <p className="text-sm text-muted-foreground mt-1">포트폴리오 합성을 위해 로그인해 주세요</p>
        </div>

        <div className="flex flex-col gap-2.5">
          {/* 네이버 — 공식 PNG 버튼 */}
          <button
            onClick={() => login('naver')}
            className="w-full h-12 rounded-lg overflow-hidden bg-[#03A94D] hover:brightness-95 transition-all flex items-center justify-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/naver_login.png" alt="네이버 로그인" className="h-full" />
          </button>

          {/* 카카오 — 공식 PNG 버튼 */}
          <button
            onClick={() => login('kakao')}
            className="w-full h-12 rounded-lg overflow-hidden bg-[#FEE500] hover:brightness-95 transition-all flex items-center justify-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/kakao_login.png" alt="카카오 로그인" className="h-full" />
          </button>

          {/* Google — CSS 버튼 + 공식 G 로고 */}
          <button
            onClick={() => login('google')}
            className="w-full h-12 rounded-lg bg-white text-[#1F1F1F] text-sm font-medium hover:bg-[#F2F2F2] transition-colors flex items-center justify-center gap-2.5 border border-[#dadce0]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/google.svg" alt="" width={18} height={18} />
            Google로 로그인
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground/60 text-center mt-4 leading-relaxed">
          계속하면{' '}
          <a href="/terms" target="_blank" className="underline hover:text-muted-foreground">이용약관</a>,{' '}
          <a href="/privacy" target="_blank" className="underline hover:text-muted-foreground">개인정보처리방침</a>,{' '}
          <a href="/privacy#third-party" target="_blank" className="underline hover:text-muted-foreground">제3자 정보제공</a>에
          동의한 것으로 간주합니다.
        </p>
      </div>
    </div>
  );
}
