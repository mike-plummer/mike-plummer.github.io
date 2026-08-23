import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import slugify from 'limax';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypePrism from 'rehype-prism-plus';
import rehypeStringify from 'rehype-stringify';
import type { Conference, ConferenceFrontmatter, Post, PostFrontmatter, Skill, SkillFrontmatter } from './types';

const contentDirectory = path.join(process.cwd(), 'content');
const postsDirectory = path.join(contentDirectory, 'posts');
const skillsDirectory = path.join(contentDirectory, 'skills');
const conferencesDirectory = path.join(contentDirectory, 'conferences');
const postImagesPublicDirectory = path.join(process.cwd(), 'public', 'post-images');

function resolveSlug(frontmatter: PostFrontmatter): string {
  if (frontmatter.path) {
    return frontmatter.path.endsWith('/') ? frontmatter.path : `${frontmatter.path}/`;
  }

  if (frontmatter.slug) {
    return frontmatter.slug.startsWith('/') ? frontmatter.slug : `/${frontmatter.slug}`;
  }

  return `/${slugify(frontmatter.title)}/`;
}

function slugToSegments(slug: string): string[] {
  return slug.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  });
}

function createExcerpt(content: string, maxLength = 250): string {
  const plainText = content
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const excerpt = plainText.slice(0, maxLength).trim();
  return excerpt.replace('This was originally posted at Object Partners', '').trim();
}

function copyPostImages(postDir: string, postFolderName: string): void {
  const targetDir = path.join(postImagesPublicDirectory, postFolderName);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const entry of fs.readdirSync(postDir, { withFileTypes: true })) {
    if (entry.isFile() && !entry.name.endsWith('.md')) {
      fs.copyFileSync(path.join(postDir, entry.name), path.join(targetDir, entry.name));
    }
  }
}

function rewritePostImagePaths(markdown: string, postFolderName: string): string {
  return markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, imagePath) => {
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return match;
    }

    const filename = path.basename(imagePath.replace(/^\.\//, ''));
    return `![${alt}](/post-images/${postFolderName}/${filename})`;
  });
}

async function markdownToHtml(markdown: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypePrism, { ignoreMissing: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);

  return String(result);
}

async function parseMarkdownFile<T>(filePath: string): Promise<{ frontmatter: T; html: string }> {
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);
  const html = await markdownToHtml(content);

  return {
    frontmatter: data as T,
    html,
  };
}

export function getPostSlugSegments(slug: string): string[] {
  return slugToSegments(slug);
}

export async function getAllPosts(): Promise<Post[]> {
  const postDirs = fs
    .readdirSync(postsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const posts = await Promise.all(
    postDirs.map(async (postFolderName) => {
      const postDir = path.join(postsDirectory, postFolderName);
      const filePath = path.join(postDir, 'index.md');
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(fileContents);
      const frontmatter = data as PostFrontmatter;

      copyPostImages(postDir, postFolderName);
      const rewrittenContent = rewritePostImagePaths(content, postFolderName);
      const html = await markdownToHtml(rewrittenContent);
      const slug = resolveSlug(frontmatter);

      return {
        slug,
        title: frontmatter.title,
        date: frontmatter.date,
        dateFormatted: formatDate(frontmatter.date),
        html,
        excerpt: createExcerpt(content),
        filePath,
      };
    }),
  );

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getPostBySlugSegments(slugSegments: string[]): Promise<Post | null> {
  const slug = `/${slugSegments.join('/')}/`;
  const posts = await getAllPosts();
  return posts.find((post) => post.slug === slug) ?? null;
}

export async function getAllSkills(): Promise<Skill[]> {
  const skillFiles = fs.readdirSync(skillsDirectory).filter((file) => file.endsWith('.md'));

  const skills = await Promise.all(
    skillFiles.map(async (file) => {
      const filePath = path.join(skillsDirectory, file);
      const { frontmatter, html } = await parseMarkdownFile<SkillFrontmatter>(filePath);

      return {
        name: frontmatter.name,
        icon: frontmatter.icon,
        order: frontmatter.order,
        brief: frontmatter.brief,
        html,
      };
    }),
  );

  return skills.sort((a, b) => a.order - b.order);
}

export async function getAllConferences(): Promise<Conference[]> {
  const conferenceFiles = fs.readdirSync(conferencesDirectory).filter((file) => file.endsWith('.md'));

  const conferences = await Promise.all(
    conferenceFiles.map(async (file) => {
      const filePath = path.join(conferencesDirectory, file);
      const { frontmatter, html } = await parseMarkdownFile<ConferenceFrontmatter>(filePath);

      return {
        order: frontmatter.order,
        name: frontmatter.name,
        icon: frontmatter.icon,
        html,
      };
    }),
  );

  return conferences.sort((a, b) => a.order - b.order);
}

export async function getPostStaticParams(): Promise<{ slug: string[] }[]> {
  const posts = await getAllPosts();
  return posts.map((post) => ({
    slug: getPostSlugSegments(post.slug),
  }));
}
