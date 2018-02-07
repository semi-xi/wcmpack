import fs from 'fs-extra'
import path from 'path'
import isFunction from 'lodash/isFunction'
import forEach from 'lodash/forEach'
import waterfall from 'async/waterfall'
import { usePlugins } from '../share/usePlugins'
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

    source = source.toString()

    let plugins = options.plugins || []
    let transformPlugins = []
    let afterTransformPlugins = []

    forEach(plugins, function (plugin) {
      if (plugin.enforce === 'after') {
        afterTransformPlugins.push(plugin)
        return
      }

      transformPlugins.push(plugin)
    })

    waterfall([
      usePlugins.bind(null, { file, source }, transformPlugins),
      (source, callback) => usePlugins({ file, source }, afterTransformPlugins, callback)
    ],
    (error, code) => {
      if (error) {
        callback(error)
        return
      }

      let relativePath = path.dirname(file).replace(srcDir, '')
      let filename = path.basename(file).replace(path.extname(file), '.wxss')
      let destination = path.join(distDir, relativePath, filename)
      let directory = path.dirname(destination)

      fs.ensureDirSync(directory)
      fs.writeFile(destination, code, (error) => {
        if (error) {
          callback(error)
          return
        }

        let stats = {
          assets: destination,
          size: code.length
        }

        callback(null, stats)
      })
    })
  })
}
