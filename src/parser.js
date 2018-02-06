import fs from 'fs-extra'
import path from 'path'
import { promisify } from 'util'
import forEach from 'lodash/forEach'
import waterfall from 'async/waterfall'
import { rootDir, srcDir, distDir, nodeModuleName } from './share/configuration'

const existsFiles = []
const promisifiedWaterfall = promisify(waterfall)

export const parse = function (file, rule, options = {}) {
  if (existsFiles.indexOf(file) !== -1) {
    return Promise.resolve(null)
  }

  existsFiles.push(file)

  let loaders = Array.isArray(rule.loaders) ? rule.loaders : []
  let plugins = Array.isArray(rule.plugins) ? rule.plugins : []

  return new Promise((resolve, reject) => {
    let stream = fs.createReadStream(file)
    forEach(loaders, ({ use: loader, options }) => {
      loader = require(loader)

      let Loader = loader.default || loader
      options.file = file
      stream = stream.pipe(new Loader(options))
    })

    let relativePath = ''
    if (file.search(srcDir) !== -1) {
      relativePath = path.dirname(file).replace(srcDir, '')
    } else if (/[\\/]node_modules[\\/]/.test(file)) {
      relativePath = path.dirname(file).replace(path.join(rootDir, 'node_modules'), nodeModuleName)
    } else {
      relativePath = path.dirname(file).replace(rootDir, '')
    }

    let filename = path.basename(file)
    if (rule.extname) {
      let extname = path.extname(file)
      filename = filename.replace(extname, rule.extname)
    }

    let destination = path.join(distDir, relativePath, filename)
    let buffers = []

    stream.on('data', (buffer) => buffers.push(buffer))
    stream.on('end', () => {
      let source = Buffer.concat(buffers)
      let assets = { file, source, rule, config: options }

      let tasks = []
      forEach(plugins, ({ use: plugin, options }) => {
        plugin = require(plugin)

        let Plugin = plugin.default || plugin
        let pluginTask = Plugin(assets, options)
        tasks.push(pluginTask)
      })

      source = assets.source
      let stats = {
        assets: destination,
        size: source.length
      }

      tasks.push(promisifiedWaterfall([
        fs.ensureFile.bind(fs, destination),
        fs.writeFile.bind(fs, destination, source),
        (callback) => callback(null, stats)
      ]))

      Promise.all(tasks).then(resolve).catch(reject)
    })
  })
}
