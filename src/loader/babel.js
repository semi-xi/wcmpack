import fs from 'fs-extra'
import path from 'path'
import assign from 'lodash/assign'
import isFunction from 'lodash/isFunction'
import { transform } from 'babel-core'
import { rootDir } from '../share/configuration'

export default function transformBabel (source, options = {}, callback) {
  if (!isFunction(callback)) {
    throw new TypeError('Callback is not a function or not be provided')
  }

  let result = void 0
  let babelrc = path.join(rootDir, '.babelrc')
  if (fs.existsSync(babelrc)) {
    assign(options, { extends: babelrc, babelrc: true })
  }

  try {
    result = transform(source, options)
  } catch (error) {
    callback(error)
    return
  }

  callback(null, result.code)
}
