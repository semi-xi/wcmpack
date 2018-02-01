import UglifyJS from 'uglify-js'

export default function uglifyJS (code, options = {}, callback) {
  if (!isFunction(callback)) {
    throw new TypeError('Callback is not a function or not be provided')
  }

  let result = void 0

  try {
    result = UglifyJS.minify(code)
  } catch (error) {
    callback(error)
    return
  }

  callback(null, result)
}
