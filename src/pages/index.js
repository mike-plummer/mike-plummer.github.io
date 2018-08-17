import React from 'react';
import { Link, graphql } from 'gatsby';

import Layout from '../components/layout';

// todo: use a post component
export default function IndexPage({ data }) {
  return (
    <Layout>
      {data.posts.edges.map(({ node: post }) => (
        <div key={post.slug}>
          <h1>
            <Link to={post.slug}>{post.frontmatter.title}</Link>
          </h1>
          <p>{post.excerpt}</p>
        </div>
      ))}
    </Layout>
  );
}

export const pageQuery = graphql`
  query IndexPage {
    posts: allMarkdownRemark {
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
