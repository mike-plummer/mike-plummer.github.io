import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { employers, projects } from '../lib/experience';
import { aboutCopy, educationCopy } from '../lib/profile';
import type { ProfileContext } from '../lib/profile/types';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(root, '..');

function readText(filePath: string) {
  return readFileSync(path.join(projectRoot, filePath), 'utf8');
}

function stripMarkdown(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildExperienceText() {
  const employerText = employers
    .map(
      (employer) => `${employer.role} at ${employer.company} (${employer.period}): ${employer.highlights.join(', ')}`
    )
    .join('\n');
  const projectText = projects
    .map((project) => `${project.name} (${project.company}): ${project.description}`)
    .join('\n');
  return `${employerText}\n${projectText}`;
}

function buildSkillsText() {
  const skillsDir = path.join(projectRoot, 'content/skills');
  return readdirSync(skillsDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const raw = readFileSync(path.join(skillsDir, file), 'utf8');
      const { data, content } = matter(raw);
      const name = typeof data.name === 'string' ? data.name : file;
      const brief = typeof data.brief === 'string' ? data.brief : '';
      return `${name}: ${brief} ${stripMarkdown(content)}`.trim();
    })
    .join('\n');
}

function buildEducationText() {
  return educationCopy.degrees.map((degree) => `${degree.level}, ${degree.field}, ${degree.school}`).join('\n');
}

function buildAboutText() {
  return `${aboutCopy.intro} ${aboutCopy.currentRole}`;
}

async function buildResumeText() {
  const resumePath = path.join(projectRoot, 'Resume_Aug2026.2.pdf');
  try {
    const buffer = readFileSync(resumePath);
    const parsed = await pdfParse(buffer);
    return parsed.text.replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

function buildCompact(context: Omit<ProfileContext, 'compact'>) {
  return [
    `Summary: ${context.summary}`,
    `Experience: ${context.experience}`,
    `Skills: ${context.skills}`,
    `Education: ${context.education}`,
    `About: ${context.about}`,
    context.linkedInAbout ? `LinkedIn: ${context.linkedInAbout}` : '',
    context.resumeText ? `Resume excerpt: ${context.resumeText.slice(0, 2500)}` : ''
  ]
    .filter(Boolean)
    .join('\n\n');
}

async function main() {
  const linkedInAbout = readText('profile.md')
    .replace(/^#\s+LinkedIn About\s*/i, '')
    .trim();
  const experience = buildExperienceText();
  const skills = buildSkillsText();
  const education = buildEducationText();
  const about = buildAboutText();
  const resumeText = await buildResumeText();

  const context: ProfileContext = {
    summary: linkedInAbout || about,
    experience,
    skills,
    education,
    about,
    linkedInAbout,
    resumeText,
    compact: ''
  };

  context.compact = buildCompact(context);

  const outputDir = path.join(projectRoot, 'public/data');
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, 'profile-context.json'), JSON.stringify(context, null, 2));
  writeFileSync(path.join(outputDir, 'profile-context-compact.txt'), context.compact);
  console.log('Generated profile context');
}

void main();
