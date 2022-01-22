import * as React from 'react';
import profilePic from "../../assets/images/mike.png";

export const AboutSection = props => (
  <div className="spotlight">
    <div className="content">
      <header className="major">
        <h2>About Mike</h2>
      </header>
      <h3>Hello!</h3>

      <strong>A little bit about myself</strong>
      <p>
        I'm a full-stack developer, dabbling in a bit of everything. Mostly front-end development in React and
        Angular with a side of Java and JVM languages like Kotlin and Groovy. Graduate of Iowa State and Penn State
        with over a decade of hobby and professional development under my belt.
      </p>

      <p>
        I now work as a Principal Consultant at <a href="https://www.improving.com" rel="noopener noreferrer">Improving</a> in Dallas, Texas.
      </p>
    </div>
    <span className="image">
      <img src={ profilePic } alt="Picture of Mike"/>
    </span>
  </div>
);