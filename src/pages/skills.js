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
            { data.skills.edges.map(skill => (
              <section key={ skill.node.name }>
                <div className="spotlight">
                  <div className="content">
                    <h1>{ skill.node.name }</h1>
                    <p>{ skill.node.content }</p>
                  </div>
                  <span className={ `image icon major logo ${skill.node.logo}` }/>
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
  query SkillsContent {
    skills: allSkillsJson {
      edges {
        node {
          name
          content
          logo
        }
      }
    }
  }
`;