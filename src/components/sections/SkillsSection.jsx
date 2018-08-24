import * as React from 'react';
import Link from "gatsby-link";

export const SkillsSection = props => (
  <React.Fragment>
    <header className="major">
      <h2>What I do</h2>
    </header>
    <ul className="features">
      {props.skills.map(skill => (
        <li key={skill.node.name}>
          <span className={`icon major style1 logo ${skill.node.logo}`}/>
          <h3>{skill.node.name}</h3>
          <p>{skill.node.label}</p>
        </li>
      ))}
    </ul>
    <footer className="major">
      <ul className="actions">
        <li>
          <Link to="/skills" className="button">
            Learn More
          </Link>
        </li>
      </ul>
    </footer>
  </React.Fragment>
);