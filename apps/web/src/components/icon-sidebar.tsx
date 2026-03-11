'use client';

import { useState, useSyncExternalStore, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Layers, User, FolderOpen, Trophy, Sun, Moon, Settings, MessageSquare, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useTheme } from 'next-themes';
import { LoginModal } from '@/components/login-modal';

const subscribe = () => () => {};
const useMounted = () => useSyncExternalStore(subscribe, () => true, () => false);

function SidebarTooltip({ label, children, disabled }: { label: string; children: React.ReactNode; disabled?: boolean }) {
  const [show, setShow] = useState(false);
  if (disabled) return <>{children}</>;
  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 px-2.5 py-1.5 rounded-md bg-popover border shadow-lg text-xs font-medium whitespace-nowrap animate-in fade-in zoom-in-95 duration-100">
          {label}
        </div>
      )}
    </div>
  );
}

function NavItem({ href, label, icon, active, expanded }: {
  href: string; label: string; icon: React.ReactNode; active: boolean; expanded: boolean;
}) {
  return (
    <SidebarTooltip label={label} disabled={expanded}>
      <Link
        href={href}
        className={`h-9 rounded-lg flex items-center gap-2.5 transition-colors ${expanded ? 'px-2.5 w-full' : 'w-9 justify-center'} ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
      >
        <span className="shrink-0 w-[18px] h-[18px] flex items-center justify-center">{icon}</span>
        {expanded && <span className="text-xs font-medium truncate">{label}</span>}
      </Link>
    </SidebarTooltip>
  );
}

export function IconSidebar() {
  const { data: session } = useSession();
  const [showLogin, setShowLogin] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useMounted();
  const pathname = usePathname();

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-expanded');
    if (saved === 'true') setExpanded(true);
  }, []);

  const toggle = useCallback(() => {
    setExpanded(prev => {
      const next = !prev;
      localStorage.setItem('sidebar-expanded', String(next));
      return next;
    });
  }, []);

  const isActive = useCallback((view: string) => {
    if (view === 'canvas') return pathname === '/';
    if (view === 'community') return pathname.startsWith('/community');
    if (view === 'gallery') return pathname.startsWith('/gallery');
    if (view === 'portfolio') return pathname === '/portfolio';
    if (view === 'settings') return pathname === '/settings';
    if (view === 'mypage') return pathname === '/mypage';
    return false;
  }, [pathname]);

  return (
    <>
      <div className={`flex flex-col items-center border-r bg-muted/30 py-3 gap-1 shrink-0 transition-all duration-200 ${expanded ? 'w-40 px-2' : 'w-12 px-0'}`}>
        <div className={`flex items-center mb-3 ${expanded ? 'w-full px-0.5 justify-between' : 'flex-col gap-3'}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="ETF Canvas" width={28} height={28} />
          <button
            onClick={toggle}
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {expanded ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
        </div>

        <NavItem href="/" label="합성" icon={<Layers className="w-[18px] h-[18px]" />} active={isActive('canvas')} expanded={expanded} />

        {session?.user && (
          <NavItem href="/portfolio" label="내 포트폴리오" icon={<FolderOpen className="w-[18px] h-[18px]" />} active={isActive('portfolio')} expanded={expanded} />
        )}

        <NavItem href="/gallery" label="TOP 포트폴리오" icon={<Trophy className="w-[18px] h-[18px]" />} active={isActive('gallery')} expanded={expanded} />
        <NavItem href="/community" label="커뮤니티" icon={<MessageSquare className="w-[18px] h-[18px]" />} active={isActive('community')} expanded={expanded} />
        <NavItem href="/settings" label="설정" icon={<Settings className="w-[18px] h-[18px]" />} active={isActive('settings')} expanded={expanded} />

        <div className={`mt-auto flex flex-col gap-1 ${expanded ? 'w-full' : 'items-center'}`}>
          <SidebarTooltip label={mounted && resolvedTheme === 'dark' ? '라이트 모드' : '다크 모드'} disabled={expanded}>
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className={`h-9 rounded-lg flex items-center gap-2.5 transition-colors text-muted-foreground hover:bg-accent hover:text-foreground ${expanded ? 'px-2.5 w-full' : 'w-9 justify-center'}`}
            >
              <span className="shrink-0 w-[18px] h-[18px] flex items-center justify-center">
                {mounted && resolvedTheme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
              </span>
              {expanded && <span className="text-xs font-medium">{mounted && resolvedTheme === 'dark' ? '라이트 모드' : '다크 모드'}</span>}
            </button>
          </SidebarTooltip>

          {session?.user ? (
            <SidebarTooltip label={session.user.name || '마이페이지'} disabled={expanded}>
              <Link
                href="/mypage"
                className={`h-9 rounded-lg flex items-center gap-2.5 transition-all ${expanded ? 'px-2.5 w-full' : 'w-9 justify-center'} ${isActive('mypage') ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-ring/30'}`}
              >
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={session.user.image} alt="" width={24} height={24} className="rounded-md object-cover shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-md bg-primary/15 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">
                    My
                  </div>
                )}
                {expanded && <span className="text-xs font-medium text-foreground truncate">{session.user.name || '마이페이지'}</span>}
              </Link>
            </SidebarTooltip>
          ) : (
            <SidebarTooltip label="로그인" disabled={expanded}>
              <button
                onClick={() => setShowLogin(true)}
                className={`h-9 rounded-lg flex items-center gap-2.5 transition-colors text-muted-foreground hover:bg-accent hover:text-foreground ${expanded ? 'px-2.5 w-full' : 'w-9 justify-center'}`}
              >
                <User className="w-[18px] h-[18px] shrink-0" />
                {expanded && <span className="text-xs font-medium">로그인</span>}
              </button>
            </SidebarTooltip>
          )}
        </div>
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
