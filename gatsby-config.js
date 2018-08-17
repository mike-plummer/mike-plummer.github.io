const path = require('path');

const filesystemNodes = [
  {
    path: path.resolve('content/blog'),
    name: 'blog'
  },
  {
    path: path.resolve('content/images'),
    name: 'images'
  },
  {
    path: path.resolve('content'),
    name: 'content'
  }
].map(options =>
  Object.assign(
    { options },
    {
      resolve: 'gatsby-source-filesystem'
    }
  )
);

module.exports = {
  siteMetadata: {
    title: 'Mike Plummer'
  },
  plugins: [
    'gatsby-plugin-react-helmet',
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: 'gatsby-starter-default',
        short_name: 'starter',
        start_url: '/',
        background_color: '#663399',
        theme_color: '#663399',
        display: 'minimal-ui',
        icon: 'favicon.png' // This path is relative to the root of the site.
      }
    },
    'gatsby-plugin-offline',
    'gatsby-transformer-remark',
    'gatsby-transformer-sharp',
    'gatsby-plugin-catch-links',
    'gatsby-plugin-emotion',
    'gatsby-plugin-sharp'
  ].concat(filesystemNodes)
};
