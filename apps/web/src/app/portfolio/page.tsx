import type { Metadata } from 'next';
import { AppShell } from '@/components/app-shell';
import { PortfolioList } from '@/components/portfolio-list';

export const metadata: Metadata = {
  title: '내 포트폴리오 — ETF Canvas',
};

export default function PortfolioListPage() {
  return (
    <AppShell>
      <PortfolioList />
    </AppShell>
  );
}
