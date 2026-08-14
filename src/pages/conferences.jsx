import React from 'react';
import HeaderGeneric from '../components/HeaderGeneric';
import { graphql } from 'gatsby';
import Layout from '../components/Layout';

export const Head = ({ data }) => {
  const siteTitle = data.site.siteMetadata.title

  return (
    <>
      <html lang="en-US" />
      <title>{`Conferences | ${siteTitle}`}</title>
      <meta name="description" content="A list of conferences Mike has spoken at." />
    </>
  )
}

class Conferences extends React.Component {
  render() {
    const { data } = this.props;
    return (
      <Layout>
        <HeaderGeneric title="Conferences" />
        <div id="main">
          <section id="content" className="main">
              <ul className="features">
                {data.conferences.edges
                    .map((edge) => edge.node)
                    .map((conference) => (
                    <li key={conference.frontmatter.order}>
                        <span className={`icon major style5 ${conference.frontmatter.icon}`}/>
                        <h3>{conference.frontmatter.name}</h3>
                        <div dangerouslySetInnerHTML={{ __html: conference.html }} />
                    </li>
                ))}
              </ul>
          </section>
        </div>
      </Layout>
    );
  }
}

export default Conferences;

export const pageQuery = graphql`
  query ConferencesIndex {
    site {
      siteMetadata {
        title
      }
    }
    conferences: allMarkdownRemark(
      sort: {frontmatter: {order: ASC}}
      filter: {type: {eq: "conferences"}}
    ) {
      edges {
        node {
          frontmatter {
            name
            icon
            order
          }
          html
        }
      }
    }
  }
`;
