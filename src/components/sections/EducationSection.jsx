import * as React from 'react';

export const EducationSection = props => (
  <React.Fragment>
    <header className="major">
      <h2>Education</h2>
      <p>
        I've been certified to know things
      </p>
    </header>
    <ul className="statistics">
      <li className="style1">
        <span className="icon fa-graduation-cap" />
        <strong>BS</strong> Computer Engineering, Iowa State University
      </li>
      <li className="style2">
        <span className="icon fa-graduation-cap" />
        <strong>ME</strong> Software Engineering, Pennsylvania State University
      </li>
    </ul>
  </React.Fragment>
);