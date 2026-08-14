import * as React from 'react';
import { Link } from "gatsby";

export const BlogSection = props => (
  <div className="content">
    <header className="major">
      <h2>Blog</h2>
    </header>
    <p>
      I also (used to) write blog posts
    </p>
    <footer className="major">
      <ul className="actions">
        <li>
          <Link to="/blog" className="button special">
            Archive
          </Link>
        </li>
      </ul>
    </footer>
  </div>
);