import React from 'react';
import PropTypes from 'prop-types';

const HeaderGeneric = (props) => (
  <header id="header">
    <h1>{props.title}</h1>
    {props.subtitle && <p>{props.subtitle}</p>}
  </header>
);

HeaderGeneric.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string
};

export default HeaderGeneric;
