module.exports = {
  siteMetadata: {
    title: 'Mike Plummer',
    author: 'Mike Plummer',
    description: 'A Gatsby.js site about Mike',
    siteUrl: `https://mike-plummer.github.io`
  },
  pathPrefix: '/',
  plugins: [
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/content/posts`,
        name: 'posts'
      }
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/content/skills`,
        name: 'skills'
      }
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/content/conferences`,
        name: 'conferences'
      }
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: `${__dirname}/src/assets/images`
      }
    },
    `gatsby-plugin-image`,
    `gatsby-transformer-sharp`,
    {
      resolve: `gatsby-transformer-remark`,
      options: {
        plugins: [
          {
            resolve: `gatsby-remark-images`,
            options: {
              maxWidth: 590
            }
          },
          `gatsby-remark-prismjs`
        ]
      }
    },
    `gatsby-plugin-react-helmet`,
    `gatsby-plugin-sass`,
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: 'Mike Plummer - Portfolio',
        short_name: 'Mike Plummer',
        start_url: '/',
        background_color: '#334b99',
        theme_color: '#334b99',
        display: 'minimal-ui',
        icon: 'src/assets/images/texas.png' // This path is relative to the project root
      }
    },
    'gatsby-plugin-offline',
    'gatsby-plugin-sharp',
    'gatsby-transformer-sharp',
    'gatsby-transformer-json',
    {
      resolve: `gatsby-plugin-google-analytics`,
      options: {
        trackingId: 'UA-70902651-1'
      }
    },
    `gatsby-plugin-sitemap`
  ]
};
