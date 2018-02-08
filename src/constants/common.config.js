import SpritesmithPlugin from '../plugins/spritesmith'
import StaticServerPlugin from '../plugins/staticServer'

export default {
  rules: [
    {
      test: /\.js$/,
      extname: '.js',
      loaders: [
        {
          use: require.resolve('../loaders/babel'),
          options: {}
        },
        {
          use: require.resolve('../loaders/envify'),
          options: {
            env: {
              NODE_ENV: 'production'
            }
          }
        },
        {
          use: require.resolve('../loaders/linkage'),
          options: {}
        }
      ]
    },
    {
      test: /\.scss$/,
      extname: '.wxss',
      loaders: [
        {
          use: require.resolve('../loaders/sass'),
          options: {}
        }
      ]
    }
  ],
  plugins: [
    new SpritesmithPlugin(),
    new StaticServerPlugin()
  ]
}
