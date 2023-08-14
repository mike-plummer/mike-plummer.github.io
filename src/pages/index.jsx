import React from 'react';
import PropTypes from 'prop-types';
import { Waypoint } from 'react-waypoint';
import { graphql } from 'gatsby';
import Header from '../components/Header';
import Nav from '../components/Nav';
import Layout from '../components/Layout';
import { AboutSection } from '../components/sections/AboutSection';
import { StatsSection } from '../components/sections/StatsSection';
import { BlogSection } from '../components/sections/BlogSection';
import { SkillsSection } from '../components/sections/SkillsSection';
import { ConferencesSection } from '../components/sections/ConferencesSection';
import { EducationSection } from '../components/sections/EducationSection';

export const Head = ({ data }) => {
  const siteTitle = data.site.siteMetadata.title
  const description = data.site.siteMetadata.description

  return (
    <>
      <html lang="en-US" />
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
    </>
  )
}

class Index extends React.Component {
  _handleWaypointEnter = () => {
    this.setState(() => ({ stickyNav: false }));
  };
  _handleWaypointLeave = () => {
    this.setState(() => ({ stickyNav: true }));
  };

  constructor(props) {
    super(props);
    this.state = {
      stickyNav: false
    };
  }

  render() {
    const { data } = this.props;
    return (
      <Layout>
        <Header />

        <Waypoint onEnter={this._handleWaypointEnter} onLeave={this._handleWaypointLeave} />
        <Nav sticky={this.state.stickyNav} />

        <div id="main">
          <section id="intro" className="main">
            <AboutSection />
          </section>

          <section id="first" className="main special">
            <EducationSection />
          </section>

          <section id="second" className="main special">
            <SkillsSection skills={data.skills?.edges} />
          </section>

          <section id="third" className="main special">
            <StatsSection />
          </section>

          <section id="fourth" className="main special">
            <ConferencesSection conferences={data.conferences?.edges} />
          </section>

          <section id="cta" className="main special">
            <BlogSection />
          </section>
        </div>
      </Layout>
    );
  }
}

Index.propTypes = {
  route: PropTypes.object
};

export default Index;

export const pageQuery = graphql`
  query IndexQuery {
    site {
      siteMetadata {
        title
        description
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
            brief
          }
        }
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
