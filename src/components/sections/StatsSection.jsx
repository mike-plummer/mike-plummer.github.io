import * as React from 'react';

export const StatsSection = props => (
  <React.Fragment>
    <header className="major">
      <h2>Stats</h2>
      <p>
        My life, reduced to numbers
      </p>
    </header>
    <ul className="statistics">
      <li className="style1">
        <span className="icon fa-calendar" />
        <strong>15</strong> Years Experience
      </li>
      <li className="style2">
        <span className="icon fa-code-fork" />
        <strong>&gt; 20000</strong> Commits
      </li>
      <li className="style3">
        <span className="icon fa-building" />
        <strong>10</strong> Clients & Companies
      </li>
      <li className="style4">
        <span className="icon fa-briefcase" />
        <strong>&gt; 25</strong> Projects & Baselines
      </li>
      <li className="style5">
        <span className="icon fa-github" />
        <strong>59</strong> Repositories
      </li>
      <li className="style6">
        <span className="icon fa-comment" />
        <strong>9</strong> Conference Talks
      </li>
    </ul>
  </React.Fragment>
);