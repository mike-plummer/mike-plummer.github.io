import React from 'react';

import logo from '../assets/images/logo.svg';

const Header = props => (
  <header id="header" className="alt">
    <span className="logo">
      <img src={logo} alt="" />
    </span>
    <h1>Mike Plummer</h1>
    <p>
      Full-stack developer in the heart of flyover country
    </p>
  </header>
);

export default Header;
