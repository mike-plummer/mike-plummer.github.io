import { employers, projects } from '@/lib/experience';
import { iconClassNames } from '@/lib/icons';

export function ExperienceSection() {
  return (
    <>
      <header className="major">
        <h2>Companies &amp; Projects</h2>
        <p>Where I&apos;ve worked and what I&apos;ve shipped</p>
      </header>
      <ul className="features">
        {employers.map((employer) => (
          <li key={employer.company}>
            <span
              className={iconClassNames(employer.icon, 'icon major style5')}
              style={{ margin: '0 0 0.4em 0', border: 'none' }}
            />
            <h3>{employer.company}</h3>
            <p>
              <strong>{employer.role}</strong>
              <br />
              {employer.period}
            </p>
            <ul>
              {employer.highlights.map((highlight) => (
                <li key={highlight} style={{ width: 'fit-content' }}>{highlight}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <header className="major">
        <h3>Recent Projects</h3>
      </header>
      <ul className="features">
        {projects.map((project) => (
          <li key={`${project.company}-${project.name}`}>
            <span
              className={iconClassNames(project.icon, 'icon major style5')}
              style={{ margin: '0 0 0.4em 0', border: 'none' }}
            />
            <h3>{project.name}</h3>
            <p>
              <strong>{project.company}</strong>
            </p>
            <p>{project.description}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
