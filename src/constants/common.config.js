export default {
  js: {
    test: './**/*.js',
    plugins: [
      {
        use: require.resolve('../plugins/babel')
      },
      {
        enforce: 'after',
        use: require.resolve('../plugins/define'),
        options: {
          env: [
            {
              NODE_ENV: 'production'
            }
          ]
        }
      }
    ]
  },
  css: {
    test: './**/*.scss',
    plugins: [
      {
        use: require.resolve('../plugins/sass')
      }
    ]
  },
  assets: {
    test: './**/*.{json,wxml}'
  }
}
