import Link from 'next/link';
import { iconClassNames } from '@/lib/icons';
import type { Skill } from '@/lib/types';

interface SkillsSectionProps {
  skills: Skill[];
}

export function SkillsSection({ skills }: SkillsSectionProps) {
  return (
    <>
      <header className="major">
        <h2>What I do</h2>
      </header>
      <ul className="features">
        {skills.map((skill) => (
          <li key={skill.name}>
            <span className={iconClassNames(skill.icon, 'icon major style5')} style={{ margin: '0 0 0.4em 0', border: 'none' }} />
            <h3>{skill.name}</h3>
            <p>{skill.brief}</p>
          </li>
        ))}
      </ul>
      <footer className="major">
        <ul className="actions">
          <li>
            <Link href="/skills" className="button">
              My Skills
            </Link>
          </li>
        </ul>
      </footer>
    </>
  );
}
