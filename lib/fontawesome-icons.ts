import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faGithub, faLinkedin } from '@fortawesome/free-brands-svg-icons';
import {
  faBriefcase,
  faBuilding,
  faCalendar,
  faCodeBranch,
  faComment,
  faCrosshairs,
  faGears,
  faGraduationCap,
  faWandMagicSparkles
} from '@fortawesome/free-solid-svg-icons';

export const fontAwesomeIcons: Record<string, IconDefinition> = {
  'fa-briefcase': faBriefcase,
  'fa-building': faBuilding,
  'fa-calendar': faCalendar,
  'fa-code-fork': faCodeBranch,
  'fa-comment': faComment,
  'fa-crosshairs': faCrosshairs,
  'fa-cogs': faGears,
  'fa-github': faGithub,
  'fa-graduation-cap': faGraduationCap,
  'fa-linkedin': faLinkedin,
  'fa-magic': faWandMagicSparkles
};

export function getFontAwesomeIcon(icon: string): IconDefinition | undefined {
  const faClass = icon
    .trim()
    .split(/\s+/)
    .find((part) => part.startsWith('fa-'));
  return faClass ? fontAwesomeIcons[faClass] : undefined;
}
