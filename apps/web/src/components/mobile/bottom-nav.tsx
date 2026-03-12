'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Home, Trophy, Layers, MessageSquare, User } from 'lucide-react';
import { useMobileUIStore } from '@/lib/mobile-ui-store';

const tabs = [
  { id: 'home' as const, label: '홈', icon: Home, href: '/' },
  { id: 'gallery' as const, label: '갤러리', icon: Trophy, href: '/gallery' },
  { id: 'canvas' as const, label: '캔버스', icon: Layers, href: '/' },
  { id: 'community' as const, label: '커뮤니티', icon: MessageSquare, href: '/community' },
  { id: 'my' as const, label: '마이', icon: User, href: '/mypage' },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { activeTab, setActiveTab } = useMobileUIStore();

  const getIsActive = (tabId: typeof tabs[number]['id']) => {
    if (tabId === 'gallery') return pathname.startsWith('/gallery');
    if (tabId === 'community') return pathname.startsWith('/community');
    if (tabId === 'my') return pathname === '/mypage' || pathname === '/settings' || pathname === '/portfolio';
    if (pathname === '/') return activeTab === tabId;
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-xl bg-background/80 md:hidden"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex h-14">
        {tabs.map((tab) => {
          const isActive = getIsActive(tab.id);
          const Icon = tab.icon;

          if (tab.id === 'home' || tab.id === 'canvas') {
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); if (pathname !== '/') router.push('/'); }}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={tab.id}
              href={tab.href}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {tab.id === 'my' && session?.user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.image} alt="" className={`w-5 h-5 rounded-full object-cover ${isActive ? 'ring-2 ring-primary' : ''}`} />
              ) : (
                <Icon className="w-5 h-5" />
              )}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
