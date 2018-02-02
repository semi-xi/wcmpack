import map from 'lodash/map'
import isFunction from 'lodash/isFunction'
import waterfall from 'async/waterfall'

export const usePlugins = function (assets, plugins, callback) {
  if (!isFunction(callback)) {
    throw new TypeError('Callback is not a function or not be provided')
  }

  let tasks = map(plugins, (plugin) => (source, callback) => {
    let transform = require(plugin.use)
    transform = transform.default || transform
    transform({ ...assets, source }, plugin.options || {}, callback)
  })

  let { source } = assets
  tasks.unshift((callback) => callback(null, source))
  waterfall(tasks, callback)
}
