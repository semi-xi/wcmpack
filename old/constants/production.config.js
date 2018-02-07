import Config from './common.config'

Config.js.plugins.push({
  enforce: 'after',
  use: require.resolve('../plugins/uglifyJS')
})

export default Config
