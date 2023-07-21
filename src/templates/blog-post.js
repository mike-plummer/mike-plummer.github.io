import React from 'react';
import Helmet from 'react-helmet';
import get from 'lodash/get';
import { graphql } from 'gatsby';
import Layout from '../components/Layout';

class BlogPostTemplate extends React.Component {
  render() {
    const post = this.props.data.markdownRemark;
    const siteTitle = get(this.props, 'data.site.siteMetadata.title');

    if (!post) {
      return null
    }

    return (
      <Layout>
        <Helmet>
          <title>{`${post.frontmatter.title} | ${siteTitle}`}</title>
          <meta name="description" content={`Blog Post: ${post.frontmatter.title}`} />
        </Helmet>

        <div id="main">
          <section id="content" className="main">
            <h1>{post.frontmatter.title}</h1>
            <p>{post.frontmatter.date}</p>
            <div dangerouslySetInnerHTML={{ __html: post.html }} />
          </section>
        </div>
      </Layout>
    );
  }
}

export default BlogPostTemplate;

export const pageQuery = graphql`
  query BlogPostByPath($path: String!) {
    site {
      siteMetadata {
        title
      }
    }
    markdownRemark(frontmatter: { path: { eq: $path } }) {
      id
      html
      frontmatter {
        title
        date(formatString: "MMMM DD, YYYY")
      }
    }
  }
`;
