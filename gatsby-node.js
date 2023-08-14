const { GraphQLString } = require('gatsby/graphql');
const slugify = require('limax');
const path = require('path');

const contentDirectoryAbsolutePath = path.resolve('content')
const postTemplateAbsolutePath = path.resolve('src/templates/blog-post.jsx')

exports.createPages = async function createPages({ actions, graphql }) {
  const { createPage } = actions;

  const results = await graphql(`
    {
      posts: allMarkdownRemark {
        edges {
          node {
            slug
          }
        }
      }
    }
  `)

  results.data.posts.edges.forEach(({ node: post }) => {
    const { slug } = post;
    createPage({
      component: postTemplateAbsolutePath,
      path: slug,
      context: {
        slug
      }
    });
  });
};

exports.setFieldsOnGraphQLNodeType = function setFieldsOnGraphQLNode({ type }) {
  switch (type.name) {
    case 'MarkdownRemark':
      return {
        type: {
          type: GraphQLString,
          resolve(source) {
            const { fileAbsolutePath } = source;
            const relativePathToSource = path.relative(contentDirectoryAbsolutePath, fileAbsolutePath)
            const type = relativePathToSource.split(path.sep)[0]

            return type
          }
        },
        slug: {
          type: GraphQLString,
          resolve(source) {
            if (!source) {
              return null
            }

            const { frontmatter } = source;

            if (!frontmatter) {
              return null
            }

            return frontmatter.path || frontmatter.slug || `/${slugify(frontmatter.title)}`;
          }
        }
      };
    default:
      return {};
  }
};
