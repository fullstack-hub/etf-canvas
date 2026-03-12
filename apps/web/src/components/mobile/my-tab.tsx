'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { FolderOpen, Settings, UserCog, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { LoginModal } from '@/components/login-modal';

export function MobileMyTab() {
  const { data: session } = useSession();
  const [showLogin, setShowLogin] = useState(false);

  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-sm text-muted-foreground">로그인하고 시작하세요</p>
        <button
          onClick={() => setShowLogin(true)}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium"
        >
          로그인
        </button>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      </div>
    );
  }

  return <AuthedMyTab session={session} />;
}

function AuthedMyTab({ session }: { session: NonNullable<ReturnType<typeof useSession>['data']> }) {
  const user = session.user;
  const { data: portfolios } = useQuery({
    queryKey: ['portfolios', 'latest'],
    queryFn: () => api.listPortfolios('latest'),
  });

  const portfolioCount = portfolios?.length ?? 0;

  const menuItems = [
    { icon: FolderOpen, label: '내 포트폴리오', href: '/portfolio', badge: portfolioCount > 0 ? `${portfolioCount}` : undefined },
    { icon: Settings, label: '설정', href: '/settings' },
    { icon: UserCog, label: '프로필 수정', href: '/mypage' },
  ];

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-4">
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center text-lg font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
          )}
          <div>
            <p className="font-bold">{user?.name || '사용자'}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        {menuItems.map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-between px-4 py-3.5 ${i < menuItems.length - 1 ? 'border-b' : ''}`}
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {item.badge && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {item.badge}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
