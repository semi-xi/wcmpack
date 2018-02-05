import fs from 'fs-extra'
import path from 'path'
import waterfall from 'async/waterfall'
import { __existsFiles__ } from './share/globals'
import { rootDir, srcDir, distDir, nodeModuleName } from './share/configuration'

export const parse = function (file, options = {}, callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('Callback is not a function or not be provided')
  }

  if (arguments.length < 3) {
    return parse(file, [], options)
  }

  if (__existsFiles__.indexOf(file) !== -1) {
    callback(null)
    return
  }

  __existsFiles__.push(file)

  let stream = fs.createReadStream(file)
  ;(options.loaders || []).forEach(({ use: loader, options }) => {
    let Loader = loader.default || loader
    options.file = file
    stream = stream.pipe(new Loader(options))
  })

  let relativePath = file.search(srcDir) !== -1
    ? path.dirname(file).replace(srcDir, '')
    : /[\\/]node_modules[\\/]/.test(file)
      ? path.dirname(file).replace(path.join(rootDir, 'node_modules'), nodeModuleName)
      : path.dirname(file).replace(rootDir, '')

  let filename = path.basename(file)
  if (options.extname) {
    let extname = path.extname(file)
    filename = filename.replace(extname, options.extname)
  }

  let destination = path.join(distDir, relativePath, filename)
  let directory = path.dirname(destination)

  let buffers = []
  stream.on('data', (buffer) => buffers.push(buffer))
  stream.on('end', () => {
    let source = Buffer.concat(buffers)
    source = source.toString()

    let pluginTasks = (options.plugins || []).map(({ use: plugin, options }) => (callback) => {
      let Plugin = plugin.default || plugin
      options.file = file
      Plugin.call(this, source, options, callback)
    })

    let writeFile = (source) => {
      fs.ensureDirSync(directory)
      fs.writeFile(destination, source, (error) => {
        if (error) {
          callback(error)
          return
        }

        let stats = {
          assets: destination,
          size: source.length
        }

        callback(null, stats)
      })
    }

    pluginTasks.length > 0
      ? waterfall(pluginTasks, (error, source) => error ? callback(error) : writeFile(source))
      : writeFile(source)
  })
}
