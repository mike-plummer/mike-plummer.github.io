import * as React from 'react';

export const ConferencesSection = props => (
  <React.Fragment>
    <header className="major">
      <h2>Conferences</h2>
      <p>Conferences I have spoken at</p>
    </header>
    <ul className="features">
      {props.conferences?.map(conference => conference.node).map(conference => (
        <li key={conference.frontmatter.order}>
          <span className={`icon major style5 ${conference.frontmatter.icon}`}/>
          <h3>{conference.frontmatter.name}</h3>
          <div dangerouslySetInnerHTML={{ __html: conference.html }} />
        </li>
      ))}
    </ul>
  </React.Fragment>
);