import React from 'react';
import get from 'lodash/get';
import Helmet from 'react-helmet';
import HeaderGeneric from '../components/HeaderGeneric';
import { Link, graphql } from 'gatsby';
import Layout from '../components/Layout';

class Blog extends React.Component {
  render() {
    const { data } = this.props;
    return (
      <Layout>
        <Helmet title={get(this, 'props.data.site.siteMetadata.title')} />

        <HeaderGeneric title="Blog" />
        <div id="main">
          <section id="content" className="main">
            {data.posts.edges.map(({ node: post }) => (
              <section key={post.slug}>
                <h1>
                  <Link to={post.slug}>{post.frontmatter.title}</Link>
                </h1>
                <p>{post.excerpt.replace('This was originally posted at Object Partners', '').trim()}</p>
              </section>
            ))}
          </section>
        </div>
      </Layout>
    );
  }
}

export default Blog;

export const pageQuery = graphql`
  query BlogIndex {
    posts: allMarkdownRemark(sort: { fields: frontmatter___date, order: DESC }, filter: { type: { eq: "posts" } }) {
      edges {
        node {
          slug
          excerpt(pruneLength: 250)
          frontmatter {
            title
          }
        }
      }
    }
  }
`;
