'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Layers, LogOut, User, FolderOpen } from 'lucide-react';
import { LoginModal } from '@/components/login-modal';
import { useCanvasStore } from '@/lib/store';

export function IconSidebar() {
  const { data: session } = useSession();
  const { currentView, setCurrentView, clearCanvas } = useCanvasStore();
  const [showLogin, setShowLogin] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <>
      <div className="flex flex-col items-center w-12 border-r bg-muted/30 py-3 gap-1 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="ETF Canvas" width={32} height={32} className="mb-4" />

        {/* 유저 / 로그인 */}
        <div className="relative">
          {session?.user ? (
            <>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-ring/30 transition-all"
                title={session.user.name || '프로필'}
              >
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={session.user.image} alt="" width={36} height={36} className="rounded-lg object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold">
                    My
                  </div>
                )}
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute top-0 left-12 ml-1 z-50 w-40 rounded-lg border bg-popover shadow-lg py-1 animate-in fade-in slide-in-from-left-2 duration-150">
                    <div className="px-3 py-2 border-b">
                      <p className="text-xs font-medium truncate">{session.user.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{session.user.email}</p>
                    </div>
                    <button
                      onClick={() => { setShowMenu(false); }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
                    >
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      마이페이지
                    </button>
                    <button
                      onClick={async () => {
                        setShowMenu(false);
                        clearCanvas();
                        const res = await fetch('/api/auth/logout');
                        const { logoutUrl } = await res.json();
                        await signOut({ redirect: false });
                        window.location.href = logoutUrl;
                      }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-destructive/10 text-destructive transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      로그아웃
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="로그인"
            >
              <User className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>

        <button
          onClick={() => setCurrentView('canvas')}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${currentView === 'canvas' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
          title="합성"
        >
          <Layers className="w-[18px] h-[18px]" />
        </button>

        {session?.user && (
          <button
            onClick={() => setCurrentView('portfolio')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${currentView === 'portfolio' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
            title="내 포트폴리오"
          >
            <FolderOpen className="w-[18px] h-[18px]" />
          </button>
        )}

        <div className="mt-auto flex flex-col items-center gap-1">
          {/* 설정 */}
          <button
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="설정"
          >
            <SettingsIcon />
          </button>
        </div>
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
