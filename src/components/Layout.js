import React from 'react';
import PropTypes from 'prop-types';
import 'font-awesome/css/font-awesome.css';
import '../assets/scss/main.scss';

import Footer from '../components/Footer';
import { Helmet } from 'react-helmet';

class Layout extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: 'is-loading'
    };
  }

  componentDidMount() {
    this.timeoutId = setTimeout(() => {
      this.setState({ loading: '' });
    }, 100);
  }

  componentWillUnmount() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  render() {
    const { children } = this.props;

    return (
      <div className={`body ${this.state.loading}`}>
        <Helmet htmlAttributes={{ lang: 'en-US' }} />
        <div id="wrapper">
          {children}
          <Footer />
        </div>
      </div>
    );
  }
}

Layout.propTypes = {
  children: PropTypes.node
};

export default Layout;
