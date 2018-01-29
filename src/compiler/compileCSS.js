import fs from 'fs-extra'
import path from 'path'
import isFunction from 'lodash/isFunction'
import defaults from 'lodash/defaults'
import { srcDir, distDir } from '../share/configuration'

export const transform = function (file, options = {}, callback) {
  if (arguments.length < 3) {
    return transform(file, {}, options)
  }

  if (!isFunction(callback)) {
    throw new TypeError('Callback is not a function or not provided')
  }

  fs.readFile(file, function (error, source) {
    if (error) {
      callback(error)
      return
    }

    let sass = require('../loader/sass')
    let transformSASS = sass.default || sass

    let sassOptions = defaults({}, options.options, {
      file,
      outputStyle: 'compressed',
      sourceComments: false,
      sourceMap: false
    })

    transformSASS(source, sassOptions, function (error, result) {
      if (error) {
        callback(error)
        return
      }

      let { code } = result
      let relativePath = path.dirname(file).replace(srcDir, '')
      let filename = path.basename(file).replace(path.extname(file), '.wxss')
      let destination = path.join(distDir, relativePath, filename)
      let directory = path.dirname(destination)

      fs.ensureDirSync(directory)
      fs.writeFile(destination, code, (error) => error ? callback(error) : callback(null, { assets: destination, size: code.length }))
    })
  })
}
