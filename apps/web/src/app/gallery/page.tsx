import type { Metadata } from 'next';
import { AppShell } from '@/components/app-shell';
import { GalleryView } from '@/components/gallery-view';

export const metadata: Metadata = {
  title: '포트폴리오 갤러리 — ETF Canvas',
  description: 'ETF Canvas 사용자들이 만든 포트폴리오를 탐색하세요. AI 분석과 성과 지표를 확인할 수 있습니다.',
  alternates: { canonical: 'https://etfcanva.com/gallery' },
  openGraph: {
    title: '포트폴리오 갤러리 — ETF Canvas',
    description: 'ETF Canvas 사용자들이 만든 포트폴리오를 탐색하세요.',
    url: 'https://etfcanva.com/gallery',
    siteName: 'ETF Canvas',
  },
};

export default function GalleryPage() {
  return (
    <AppShell>
      <GalleryView />
    </AppShell>
  );
}
