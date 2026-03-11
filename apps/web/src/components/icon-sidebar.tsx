'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { Layers, User, FolderOpen, Trophy, Sun, Moon, Settings, MessageSquare } from 'lucide-react';
import { useTheme } from 'next-themes';
import { LoginModal } from '@/components/login-modal';
import { useCanvasStore } from '@/lib/store';

export function IconSidebar() {
  const { data: session } = useSession();
  const { currentView, setCurrentView } = useCanvasStore();
  const [showLogin, setShowLogin] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === '/';

  const navigate = (view: 'canvas' | 'gallery' | 'portfolio' | 'settings' | 'mypage' | 'community') => {
    if (isHome) {
      setCurrentView(view);
    } else {
      setCurrentView(view);
      router.push('/');
    }
  };

  return (
    <>
      <div className="flex flex-col items-center w-12 border-r bg-muted/30 py-3 gap-1 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="ETF Canvas" width={32} height={32} className="mb-4" />

        <button
          onClick={() => navigate('canvas')}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${currentView === 'canvas' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
          title="합성"
        >
          <Layers className="w-[18px] h-[18px]" />
        </button>

        {session?.user && (
          <button
            onClick={() => navigate('portfolio')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${currentView === 'portfolio' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
            title="내 포트폴리오"
          >
            <FolderOpen className="w-[18px] h-[18px]" />
          </button>
        )}

        <button
          onClick={() => navigate('gallery')}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${currentView === 'gallery' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
          title="TOP 포트폴리오"
        >
          <Trophy className="w-[18px] h-[18px]" />
        </button>

        <button
          onClick={() => navigate('community')}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${currentView === 'community' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
          title="커뮤니티"
        >
          <MessageSquare className="w-[18px] h-[18px]" />
        </button>

        <button
          onClick={() => navigate('settings')}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${currentView === 'settings' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
          title="설정"
        >
          <Settings className="w-[18px] h-[18px]" />
        </button>

        <div className="mt-auto flex flex-col items-center gap-1">
          <button
            onClick={() => {
              const next = resolvedTheme === 'dark' ? 'light' : 'dark';
              setTheme(next);
            }}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors text-muted-foreground hover:bg-accent hover:text-foreground"
            title={mounted && resolvedTheme === 'dark' ? '라이트 모드' : '다크 모드'}
          >
            {mounted && resolvedTheme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>
          {/* 유저 / 로그인 */}
          <div className="relative">
            {session?.user ? (
              <button
                onClick={() => navigate('mypage')}
                className={`w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden transition-all ${currentView === 'mypage' ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-ring/30'}`}
                title={session.user.name || '마이페이지'}
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
        </div>
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}

