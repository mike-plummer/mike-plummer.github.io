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
        <strong>12</strong> Years Experience
      </li>
      <li className="style2">
        <span className="icon fa-code-fork" />
        <strong>&gt; 10000</strong> Commits
      </li>
      <li className="style3">
        <span className="icon fa-building" />
        <strong>5</strong> Clients
      </li>
      <li className="style4">
        <span className="icon fa-briefcase" />
        <strong>9</strong> Projects
      </li>
      <li className="style5">
        <span className="icon fa-github" />
        <strong>36</strong> Repositories
      </li>
      <li className="style6">
        <span className="icon fa-comment" />
        <strong>9</strong> Conference Talks
      </li>
    </ul>
  </React.Fragment>
);