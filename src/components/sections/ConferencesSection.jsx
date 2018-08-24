import * as React from 'react';

export const ConferencesSection = props => (
  <React.Fragment>
    <header className="major">
      <h2>Conferences</h2>
      <p>Conferences I have spoken at</p>
    </header>
    <ul className="features">
      {props.conferences.map(conference => (
        <li key={conference.node.order}>
          <span className={`icon major style1 logo ${conference.node.logo}`}/>
          <h3>{conference.node.name}</h3>
          {conference.node.talks.map((talk, index) => (
            <div key={index}>{talk}</div>
          ))}
        </li>
      ))}
    </ul>
  </React.Fragment>
);