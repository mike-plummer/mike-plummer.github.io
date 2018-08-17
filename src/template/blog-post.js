import React from 'react';
import { graphql } from 'gatsby';

import Layout from '../components/layout';
import 'prismjs/themes/prism-okaidia.css';

export default function BlogPost({ data }) {
  return (
    <Layout>
      <h1>{data.post.frontmatter.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: data.post.html }} />
    </Layout>
  );
}

export const pageQuery = graphql`
  query BlogPostBySlug($slug: String!) {
    post: markdownRemark(slug: { eq: $slug }) {
      html
      frontmatter {
        title
      }
    }
  }
`;
