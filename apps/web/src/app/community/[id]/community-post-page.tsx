'use client';

import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { CommunityPostDetail } from '@/components/community-post-detail';

export function CommunityPostPage({ postId }: { postId: string }) {
  const router = useRouter();
  return (
    <AppShell>
      <CommunityPostDetail
        postId={postId}
        onBack={() => {
          router.push('/community');
        }}
      />
    </AppShell>
  );
}
