import React from 'react';
import Scrollspy from 'react-scrollspy';
import Scroll from './Scroll';

const Nav = (props) => (
  <nav id="nav" className={props.sticky ? 'alt' : ''}>
    <Scrollspy items={['intro', 'first', 'second', 'third', 'fourth', 'cta']} currentClassName="is-active" offset={-300}>
      {[
        ['intro', 'About'],
        ['first', 'Education'],
        ['second', 'Skills'],
        ['third', 'Stats'],
        ['fourth', 'Conferences'],
        ['cta', 'Blog']
      ].map((entry) => (
        <li key={entry[0]}>
          <Scroll type="id" element={entry[0]}>
            <a href="#">{entry[1]}</a>
          </Scroll>
        </li>
      ))}
    </Scrollspy>
  </nav>
);

export default Nav;
