import type { Metadata } from 'next';
import { AppShell } from '@/components/app-shell';
import { MypageView } from '@/components/mypage-view';

export const metadata: Metadata = {
  title: '마이페이지 — ETF Canvas',
};

export default function MypagePage() {
  return (
    <AppShell>
      <MypageView />
    </AppShell>
  );
}
