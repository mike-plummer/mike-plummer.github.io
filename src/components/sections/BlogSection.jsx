import * as React from 'react';
import Link from "gatsby-link";

export const BlogSection = props => (
  <div className="content">
    <header className="major">
      <h2>Blog</h2>
    </header>
    <p>
      Read the latest of my (infrequent) blog posts
    </p>
    <footer className="major">
      <ul className="actions">
        <li>
          <Link to="/blog" className="button special">
            Read More
          </Link>
        </li>
      </ul>
    </footer>
  </div>
);