export interface PostFrontmatter {
  title: string;
  date: string;
  path?: string;
  slug?: string;
}

export interface Post {
  slug: string;
  title: string;
  date: string;
  dateFormatted: string;
  html: string;
  excerpt: string;
  filePath: string;
}

export interface SkillFrontmatter {
  name: string;
  icon: string;
  order: number;
  brief: string;
}

export interface Skill {
  name: string;
  icon: string;
  order: number;
  brief: string;
  html: string;
}

export interface ConferenceFrontmatter {
  order: number;
  name: string;
  icon: string;
}

export interface Conference {
  order: number;
  name: string;
  icon: string;
  html: string;
}
