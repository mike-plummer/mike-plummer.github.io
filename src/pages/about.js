import React from 'react';
import { graphql } from 'gatsby';
import Image from 'gatsby-image';

import Layout from '../components/layout';

export default function About({ data }) {
  return (
    <Layout>
      <Image fixed={data.avatar.childImageSharp.fixed} />
      <div dangerouslySetInnerHTML={{ __html: data.about.html }} />
    </Layout>
  );
}

export const pageQuery = graphql`
  query AboutQuery {
    about: markdownRemark(fileAbsolutePath: { regex: "/about.md/" }) {
      html
    }

    avatar: file(relativePath: { regex: "images/headshot.png/" }) {
      childImageSharp {
        fixed(width: 200) {
          ...GatsbyImageSharpFixed
        }
      }
    }
  }
`;
