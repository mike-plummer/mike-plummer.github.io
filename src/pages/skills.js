import React from 'react';
import get from 'lodash/get';
import Helmet from 'react-helmet';
import HeaderGeneric from '../components/HeaderGeneric';
import { graphql } from 'gatsby';
import Layout from '../components/Layout';

class Skills extends React.Component {
  render() {
    const { data } = this.props;
    return (
      <Layout>
        <Helmet title={ get(this, 'props.data.site.siteMetadata.title') }/>

        <HeaderGeneric title="Skills"/>
        <div id="main">
          <section id="content" className="main">
            { data.skills.edges.map(edge => edge.node).map(skill => (
              <section key={ skill.frontmatter.name }>
                <div className="spotlight">
                  <div className="content">
                    <h1>{ skill.frontmatter.name }</h1>
                    <div dangerouslySetInnerHTML={{ __html: skill.html }} />
                  </div>
                  <span className={ `image icon major ${skill.frontmatter.icon}` }/>
                </div>
              </section>
            )) }
          </section>
        </div>
      </Layout>
    );
  }
}

export default Skills;

export const pageQuery = graphql`
  query SkillsIndex {
    skills: allMarkdownRemark(
      sort: { fields: frontmatter___order, order: ASC }
      filter: { type: { eq: "skills" } }
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