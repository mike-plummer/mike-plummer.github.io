import React from 'react';
import HeaderGeneric from '../components/HeaderGeneric';
import { graphql } from 'gatsby';
import Layout from '../components/Layout';

export const Head = ({ data }) => {
  const siteTitle = data.site.siteMetadata.title

  return (
    <>
      <html lang="en-US" />
      <title>{`Skills | ${siteTitle}`}</title>
      <meta name="description" content="A description of the tools and technologies that Mike has experience with." />
    </>
  )
}

class Skills extends React.Component {
  render() {
    const { data } = this.props;
    return (
      <Layout>
        <HeaderGeneric title="Skills" />
        <div id="main">
          <section id="content" className="main">
            {data.skills.edges
              .map((edge) => edge.node)
              .map((skill) => (
                <section key={skill.frontmatter.name}>
                  <div className="spotlight">
                    <div className="content">
                      <h1>{skill.frontmatter.name}</h1>
                      <div dangerouslySetInnerHTML={{ __html: skill.html }} />
                    </div>
                    <span className={`image icon major ${skill.frontmatter.icon}`} />
                  </div>
                </section>
              ))}
          </section>
        </div>
      </Layout>
    );
  }
}

export default Skills;

export const pageQuery = graphql`
  query SkillsIndex {
    site {
      siteMetadata {
        title
      }
    }
    skills: allMarkdownRemark(
      sort: {frontmatter: {order: ASC}}
      filter: {type: {eq: "skills"}}
    ) {
      edges {
        node {
          frontmatter {
            name
            icon
          }
          html
        }
      }
    }
  }
`;
