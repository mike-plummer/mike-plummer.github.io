/**
 * Converts frontmatter icon values (e.g. "logo react", "fa-magic") into CSS class strings.
 */
export function iconClassNames(icon: string, baseClasses = ''): string {
  const parts = icon.trim().split(/\s+/).filter(Boolean);
  const classes = [...baseClasses.split(/\s+/).filter(Boolean), ...parts];

  if (parts.some((part) => part.startsWith('fa-')) && !classes.includes('fa')) {
    const faIndex = classes.findIndex((part) => part.startsWith('fa-'));
    classes.splice(faIndex, 0, 'fa');
  }

  return classes.join(' ');
}
