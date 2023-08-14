import React from 'react';
import { graphql } from 'gatsby';
import Layout from '../components/Layout';

export const Head = ({ data }) => {
  const post = data.markdownRemark;
  const siteTitle = data.site.siteMetadata.title

  return (
    <>
      <title>{`${post.frontmatter.title} | ${siteTitle}`}</title>
      <meta name="description" content={`Blog Post: ${post.frontmatter.title}`} />
    </>
  )
}

class BlogPostTemplate extends React.Component {
  render() {
    const post = this.props.data.markdownRemark;
    

    if (!post) {
      return null
    }

    return (
      <Layout>
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
