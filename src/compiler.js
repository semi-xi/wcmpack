import fs from 'fs-extra'
import path from 'path'
import { Transform } from 'stream'
import { promisify } from 'util'
import chokidar from 'chokidar'
import forEach from 'lodash/forEach'
import flattenDeep from 'lodash/flattenDeep'
import waterfall from 'async/waterfall'
import { findForMatch } from './share/finder'
import { rootDir, distDir, srcDir, nodeModuleName } from './share/configuration'

const promisifiedWaterfall = promisify(waterfall)

class LoaderTransform extends Transform {
  constructor (loaders, file, rule, options, compiler) {
    super()

    this._source = ''
    this._loaders = loaders
    this._file = file
    this._rule = rule
    this._parseOptions = options
    this._compiler = compiler
  }

  _transform (buffer, encodeType, callback) {
    this._source += buffer
    callback()
  }

  _flush (callback) {
    let source = this._source
    forEach(this._loaders, ({ use: Loader, options }) => {
      Loader = require(Loader)
      Loader = Loader.default || Loader

      let compiler = this._compiler
      let argv = { file: this._file, rule: this._rule, options: this._parseOptions }
      source = Loader(source, options, { compiler, argv })
    })

    this.push(source)
    callback()
  }
}

export class Compiler {
  constructor () {
    this.tasks = []
    this.assets = []
  }

  addTask (task) {
    if (!(task instanceof Promise)) {
      throw new TypeError('Task is not a Promise or not be provided')
    }

    this.tasks.push(task)
  }

  existsAssets (file) {
    return this.assets.indexOf(file) !== -1
  }

  addAssets (file) {
    this.assets.push(file)
  }

  transform (directory, options = {}) {
    options = Object.assign({ root: rootDir, src: srcDir, dist: distDir }, options)

    this.assets = []

    let startTime = Date.now()
    let files = findForMatch(directory, options.rules)

    forEach(files, (rules, file) => {
      let task = this.parse(file, rules[0], options)
      this.addTask(task)
    })

    return Promise.all(this.tasks).then((result) => {
      console.log(this.tasks)

      let stats = flattenDeep(result).filter((result) => result)
      stats.spendTime = Date.now() - startTime
      return stats
    })
  }

  watchTransform (directory, options = {}, handleEachCallback) {
    if (typeof handleEachCallback !== 'function') {
      throw new TypeError('Callback is not a function or not provided')
    }

    let handleTransform = () => {
      this.transform(directory, options)
        .then((stats) => handleEachCallback(null, stats))
        .catch((error) => handleEachCallback(error))
    }

    let watcher = chokidar.watch(directory)
    watcher.on('change', handleTransform)
    watcher.on('unlink', handleTransform)

    let handleProcessSigint = process.exit.bind(process)

    let handleProcessExit = function () {
      watcher && watcher.close()

      process.removeListener('exit', handleProcessExit)
      process.removeListener('SIGINT', handleProcessSigint)

      handleProcessExit = undefined
      handleProcessSigint = undefined
    }

    process.on('exit', handleProcessExit)
    process.on('SIGINT', handleProcessSigint)
  }

  parse (file, rule, options = {}) {
    if (this.existsAssets(file)) {
      return Promise.resolve(null)
    }

    this.addAssets(file)

    let { src: srcDir, root: rootDir, dist: distDir } = options
    let loaders = Array.isArray(rule.loaders) ? rule.loaders : []
    // let plugins = Array.isArray(rule.plugins) ? rule.plugins : []

    let relativePath = file.search(srcDir) !== -1
      ? path.dirname(file).replace(srcDir, '')
      : /[\\/]node_modules[\\/]/.test(file)
        ? path.dirname(file).replace(path.join(rootDir, 'node_modules'), nodeModuleName)
        : path.dirname(file).replace(rootDir, '')

    let filename = path.basename(file)
    if (rule.extname) {
      let extname = path.extname(file)
      filename = filename.replace(extname, rule.extname)
    }

    let destination = path.join(distDir, relativePath, filename)
    let directory = path.dirname(destination)

    let readStream = fs.createReadStream(file)
    // let writeStream = fs.createWriteStream(destination)
    let transStream = new LoaderTransform(loaders, file, rule, options, this)
    readStream = readStream.pipe(transStream)

    return new Promise((resolve, reject) => {
      let buffers = []
      readStream.on('data', (buffer) => buffers.push(buffer))
      readStream.on('end', function () {
        let source = Buffer.concat(buffers)

        let stats = {
          assets: destination,
          size: source.size
        }

        let queue = [
          fs.ensureDir.bind(fs, directory),
          fs.writeFile.bind(fs, destination, source),
          (callback) => callback(null, stats)
        ]

        promisifiedWaterfall(queue).then(resolve).catch(reject)
      })
    })
  }
}
