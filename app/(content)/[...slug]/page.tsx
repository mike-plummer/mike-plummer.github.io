import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SiteLayout from '@/components/SiteLayout';
import { getAllPosts, getPostBySlugSegments, getPostStaticParams } from '@/lib/content';

interface BlogPostPageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateStaticParams() {
  return getPostStaticParams();
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlugSegments(slug);

  if (!post) {
    return {};
  }

  return {
    title: post.title,
    description: `Blog Post: ${post.title}`
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlugSegments(slug);

  if (!post) {
    notFound();
  }

  // Ensure posts are generated at build time
  await getAllPosts();

  return (
    <SiteLayout>
      <div id="main">
        <section id="content" className="main">
          <h1>{post.title}</h1>
          <p>{post.dateFormatted}</p>
          <div dangerouslySetInnerHTML={{ __html: post.html }} />
        </section>
      </div>
    </SiteLayout>
  );
}
