import Config, { JSRule } from './common.config'

JSRule.loaders.push({
  use: require.resolve('../loaders/uglifyJS'),
  options: {}
})

export default Config
