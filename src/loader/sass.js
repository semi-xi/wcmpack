import assign from 'lodash/assign'
import isFunction from 'lodash/isFunction'
import { render } from 'node-sass'

export default function transform (code, options = {}, callback) {
  if (!isFunction(callback)) {
    throw new TypeError('Callback is not a function or not provided')
  }

  options = assign({
    data: code.toString(),
    outputStyle: 'compressed',
    sourceComments: false,
    sourceMap: false
  }, options)

  render(options, (error, result) => {
    if (error) {
      callback(error)
      return
    }

    let { css: code, map } = result
    callback(null, { code, map })
  })
}
