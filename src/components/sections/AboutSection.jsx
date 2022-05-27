import * as React from 'react';
import { StaticImage } from 'gatsby-plugin-image';

export const AboutSection = props => (
  <div className="spotlight">
    <div className="content">
      <header className="major">
        <h2>About Mike</h2>
      </header>
      <h3>Hello!</h3>

      <strong>A little bit about myself</strong>
      <p>
        I'm a full-stack developer, dabbling in a bit of everything. Mostly front-end development in React and Typescript,
        and I dabble on the server-side with Java. Graduate of Iowa State and Penn State
        with over a decade of hobby and professional development under my belt.
      </p>

      <p>
        I am currently with <a href="https://www.cypress.io" rel="noopener noreferrer">Cypress</a>, working from Dallas, Texas.
      </p>
    </div>
    <span className="image">
      <StaticImage src="../../assets/images/mike.png" alt="Picture of Mike" loading="eager" />
    </span>
  </div>
);
