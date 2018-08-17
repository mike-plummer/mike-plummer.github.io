import React from 'react';
import { Link, graphql } from 'gatsby';

import Layout from '../components/layout';

// todo: use a post component
export default function IndexPage({ data }) {
  return (
    <Layout>
      {data.posts.edges.map(
        ({ node: post }) =>
          console.log(post.excerpt) || (
            <div key={post.slug}>
              <h1>
                <Link to={post.slug}>{post.frontmatter.title}</Link>
              </h1>
              <p>
                {post.excerpt
                  .replace('This was originally posted at  Object Partners', '')
                  .trim()}
              </p>
            </div>
          )
      )}
    </Layout>
  );
}

export const pageQuery = graphql`
  query IndexPage {
    posts: allMarkdownRemark(
      sort: { fields: frontmatter___modified, order: DESC }
      filter: { type: { eq: "blog" } }
    ) {
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
