import { Icon } from '@/components/Icon';

export function StatsSection() {
  return (
    <>
      <header className="major">
        <h2>Stats</h2>
        <p>My life, reduced to numbers</p>
      </header>
      <ul className="statistics">
        <li className="style1">
          <Icon icon="fa-calendar" className="icon" />
          <strong>15</strong> Years Experience
        </li>
        <li className="style2">
          <Icon icon="fa-building" className="icon" />
          <strong>10</strong> Clients & Companies
        </li>
        <li className="style3">
          <Icon icon="fa-briefcase" className="icon" />
          <strong>30+</strong> Projects & Baselines
        </li>
        <li className="style4">
          <Icon icon="fa-code-fork" className="icon" />
          <strong>35000+</strong> Commits
        </li>
        <li className="style5">
          <Icon icon="fa-github" className="icon" />
          <strong>59</strong> Repositories
        </li>
        <li className="style6">
          <Icon icon="fa-comment" className="icon" />
          <strong>9</strong> Conference Talks
        </li>
      </ul>
    </>
  );
}
