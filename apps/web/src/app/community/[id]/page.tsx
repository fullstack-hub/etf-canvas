import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CommunityPostPage } from './community-post-page';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function safeJsonLd(obj: object): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

interface PostData {
  id: string;
  title: string;
  content: string;
  portfolioId: string | null;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  createdAt: string;
  author: { nickname: string };
  category: { slug: string; name: string };
}

async function getPost(id: string): Promise<PostData | null> {
  try {
    const res = await fetch(`${API_BASE}/community/posts/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const data = await getPost(id);
  if (!data) return { title: '게시글을 찾을 수 없습니다 | ETF Canvas' };

  const title = `${data.title} | ETF Canvas 커뮤니티`;
  const description = data.content.slice(0, 150).replace(/\n/g, ' ');

  return {
    title,
    description,
    alternates: { canonical: `https://etf-canvas.com/community/${id}` },
    openGraph: {
      title,
      description,
      url: `https://etf-canvas.com/community/${id}`,
      siteName: 'ETF Canvas',
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getPost(id);
  if (!data) notFound();

  // JSON-LD: safeJsonLd로 </script> 패턴 이스케이프 (XSS 방지)
  const jsonLd = safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    headline: data.title,
    text: data.content.slice(0, 300),
    author: { '@type': 'Person', name: data.author.nickname },
    datePublished: data.createdAt,
    interactionStatistic: [
      { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: data.likeCount },
      { '@type': 'InteractionCounter', interactionType: 'https://schema.org/CommentAction', userInteractionCount: data.commentCount },
    ],
    url: `https://etf-canvas.com/community/${id}`,
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <CommunityPostPage postId={id} />
    </>
  );
}
