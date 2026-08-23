import type { Metadata } from 'next';
import HomePage from '@/components/HomePage';
import { getAllSkills } from '@/lib/content';
import { siteMetadata } from '@/lib/site';

export const metadata: Metadata = {
  title: siteMetadata.title,
  description: siteMetadata.description
};

export default async function Page() {
  const skills = await getAllSkills();

  return <HomePage skills={skills} />;
}
