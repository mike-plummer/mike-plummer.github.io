import type { Metadata } from 'next';
import Link from 'next/link';
import HeaderGeneric from '@/components/HeaderGeneric';
import Layout from '@/components/Layout';
import { getAllPosts } from '@/lib/content';
export const metadata: Metadata = {
  title: 'Blog',
  description: 'Blog posts that Mike has written.'
};

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <Layout>
      <HeaderGeneric title="Blog" />
      <div id="main">
        <section id="content" className="main">
          {posts.map((post) => (
            <section key={post.slug}>
              <h1>
                <Link href={post.slug}>{post.title}</Link>
              </h1>
              <p>{post.excerpt}</p>
            </section>
          ))}
        </section>
      </div>
    </Layout>
  );
}
