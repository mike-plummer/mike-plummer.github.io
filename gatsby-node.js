const { GraphQLString } = require('gatsby/graphql');
const slugify = require('limax');
const path = require('path');

exports.createPages = async function createPages({ actions, graphql }) {
  const { createPage } = actions;

  const { posts } = await graphql(`
    {
      posts: allMarkdownRemark {
        edges {
          node {
            slug
          }
        }
      }
    }
  `).then((result) => {
    if (result.errors) {
      return Promise.reject(result.errors);
    }
    return result.data;
  });

  const postTemplate = path.resolve('src/templates/blog-post.js');

  posts.edges.forEach(({ node: post }) => {
    const { slug } = post;
    createPage({
      component: postTemplate,
      path: post.slug,
      context: {
        slug
      } // add next/prev or whatever you want here
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
            const [, folder] = fileAbsolutePath.split(path.resolve('content')).pop().split('/');
            return folder;
          }
        },
        slug: {
          type: GraphQLString,
          resolve(source) {
            const { frontmatter } = source;
            return frontmatter.path || frontmatter.slug || `/${slugify(frontmatter.title)}`;
          }
        }
      };
    default:
      return {};
  }
};
