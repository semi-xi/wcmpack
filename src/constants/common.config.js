export default {
  rules: [
    {
      test: './src/**/*.js',
      extname: '.js',
      loaders: [
        {
          use: require('../loaders/babel'),
          options: {}
        },
        {
          use: require('../loaders/envify'),
          options: {
            env: {
              NODE_ENV: 'production'
            }
          }
        }
      ],
      plugins: [
        {
          use: require('../plugins/linkage'),
          options: {}
        }
      ]
    },
    {
      test: './src/**/*.scss',
      extname: '.css',
      loaders: [
        {
          use: require('../loaders/sass'),
          options: {}
        }
      ]
    }
  ]
}
