import React from 'react';
import PropTypes from 'prop-types';
import Helmet from 'react-helmet';
import { StaticQuery, graphql } from 'gatsby';
import styled from 'react-emotion';

import Header from './header';
import 'normalize.css';

const Container = styled.div`
  margin: 0 auto;
  max-width: 960px;
  padding: 0 1rem 1.5rem;
  padding-top: 0;
`;

export default function Layout({ children, data, meta }) {
  return (
    <StaticQuery
      query={graphql`
        query SiteTitleQuery {
          site {
            siteMetadata {
              title
            }
          }
        }
      `}
      render={data => (
        <>
          <Helmet
            title="Blog"
            titleTemplate={`%s | ${data.site.siteMetadata.title}`}
            meta={[
              {
                name: 'description',
                content: 'The newest of my (infrequent) blog posts.'
              },
              { name: 'keywords', content: 'javascript, react, angular, vue' }
            ].concat(meta)}
          >
            <html lang="en" />
          </Helmet>
          <Header siteTitle={data.site.siteMetadata.title} />
          <Container>{children}</Container>
        </>
      )}
    />
  );
}

Layout.propTypes = {
  children: PropTypes.node.isRequired
};

Layout.defaultProps = {
  meta: []
};
