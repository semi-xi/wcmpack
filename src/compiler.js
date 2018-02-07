import fs from 'fs-extra'
import path from 'path'
import { Transform } from 'stream'
import map from 'lodash/map'
import forEach from 'lodash/forEach'
import flattenDeep from 'lodash/flattenDeep'
import { findForMatch } from './share/finder'
import { rootDir, distDir, srcDir, nodeModuleName } from './share/configuration'

class LoaderTransform extends Transform {
  constructor (loaders, file, rule, options, parser, compiler) {
    super()

    this._source = ''
    this._loaders = loaders
    this._file = file
    this._rule = rule
    this._parseOptions = options
    this._parser = parser
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

      let { _compiler: compiler, _parser: parser } = this
      let argv = { file: this._file, rule: this._rule, options: this._parseOptions }
      source = Loader(source, options, { compiler, parser, argv })
    })

    this.push(source)
    callback()
  }
}

export class Compiler {
  constructor () {
    this.assets = []
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
    let tasks = map(files, (rules, file) => this.parse(file, rules[0], options))
    return Promise.all(tasks).then((result) => {
      let stats = flattenDeep(result).filter((result) => result)
      stats.spendTime = Date.now() - startTime
      return stats
    })
  }

  parse (file, rule, options = {}) {
    if (this.existsAssets(file)) {
      return Promise.resolve(null)
    }

    this.addAssets(file)

    return new Promise((resolve, reject) => {
      let { src: srcDir, root: rootDir, dist: distDir } = options
      let loaders = Array.isArray(rule.loaders) ? rule.loaders : []

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

      let parser = {
        _tasks: [],
        addTask (task) {
          this._tasks.push(task)
        }
      }

      let destination = path.join(distDir, relativePath, filename)
      fs.ensureFileSync(destination)

      let readStream = fs.createReadStream(file)
      let writeStream = fs.createWriteStream(destination)
      let transStream = new LoaderTransform(loaders, file, rule, options, parser, this)

      readStream = readStream.pipe(transStream)

      let buffers = []
      readStream.on('data', (buffer) => buffers.push(buffer))
      readStream.on('end', function () {
        let source = Buffer.concat(buffers)

        let stats = {
          assets: destination,
          size: source.byteLength
        }

        Promise
          .all(parser._tasks)
          .then((allStats) => resolve(allStats.concat(stats)))
          .catch(reject)
      })

      readStream.pipe(writeStream)
    })
  }
}
