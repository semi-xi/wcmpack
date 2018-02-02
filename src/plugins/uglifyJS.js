import isFunction from 'lodash/isFunction'
import UglifyJS from 'uglify-js'

export default function UglifyJSPlugin (assets, options = {}, callback) {
  if (!isFunction(callback)) {
    throw new TypeError('Callback is not a function or not be provided')
  }

  let { source } = assets
  let { error, code } = UglifyJS.minify(source)
  if (error) {
    callback(error)
    return
  }

  callback(null, code)
}
