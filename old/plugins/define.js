import assign from 'lodash/assign'
import EnvifyReplace from 'loose-envify/replace'
import isFunction from 'lodash/isFunction'

export default function DefinePlugin (assets, options = {}, callback) {
  if (!isFunction(callback)) {
    throw new TypeError('Callback is not a function or not be provided')
  }

  let { source } = assets
  let result = void 0

  try {
    let env = assign({}, process.env, options.env)
    result = EnvifyReplace(source, [env || process.env])
  } catch (error) {
    callback(error)
    return
  }

  callback(null, result)
}
