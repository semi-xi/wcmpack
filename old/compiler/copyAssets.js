import fs from 'fs-extra'
import path from 'path'
import waterfall from 'async/waterfall'
import isFunction from 'lodash/isFunction'
import { srcDir, distDir } from '../share/configuration'

export const copy = function (file, options = {}, callback) {
  if (arguments.length < 3) {
    return copy(file, {}, options)
  }

  if (!isFunction(callback)) {
    throw new TypeError('Callback is not a function or not provided')
  }

  let relativePath = path.dirname(file).replace(srcDir, '')
  let filename = path.basename(file)
  let destination = path.join(distDir, relativePath, filename)
  let directory = path.dirname(destination)

  fs.ensureDirSync(directory)

  let queue = [
    fs.copy.bind(fs, file, destination),
    fs.stat.bind(fs, destination)
  ]

  waterfall(queue, (error, stats) => {
    error
      ? callback(error)
      : callback(null, { assets: destination, size: stats.size })
  })
}
