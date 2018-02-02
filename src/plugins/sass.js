import assign from 'lodash/assign'
import isFunction from 'lodash/isFunction'
import { render } from 'node-sass'

export default function SassPlugin (assets, options = {}, callback) {
  if (!isFunction(callback)) {
    throw new TypeError('Callback is not a function or not provided')
  }

  let { file, source } = assets

  options = assign({
    file,
    data: source,
    outputStyle: 'compressed',
    sourceComments: false,
    sourceMap: false
  }, options)

  render(options, (error, result) => {
    if (error) {
      callback(error)
      return
    }

    let { css: code } = result
    callback(null, code)
  })
}
