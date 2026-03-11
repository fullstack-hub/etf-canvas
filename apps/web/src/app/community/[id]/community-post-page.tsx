'use client';

import { AppShell } from '@/components/app-shell';
import { CommunityPostDetail } from '@/components/community-post-detail';

export function CommunityPostPage({ postId }: { postId: string }) {
  return (
    <AppShell>
      <CommunityPostDetail
        postId={postId}
        onBack={() => {
          window.location.href = '/community';
        }}
      />
    </AppShell>
  );
}
