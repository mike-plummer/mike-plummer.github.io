import * as React from 'react';
import { Link } from "gatsby";

export const ConferencesSection = props => (
  <React.Fragment>
    <header className="major">
      <h2>Conferences</h2>
      <p>I used to speak at conferences (no longer)</p>
    </header>
    <footer className="major">
      <ul className="actions">
        <li>
          <Link to="/conferences" className="button special">
            Archive
          </Link>
        </li>
      </ul>
    </footer>
  </React.Fragment>
);