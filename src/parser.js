import fs from 'fs-extra'
import { Transform } from 'stream'
import forEach from 'lodash/forEach'
import Assets from './assets'
import OptionManager from './optionManager'

class TaskManager {
  constructor () {
    this.tasks = []
  }

  addTask (task) {
    if (task instanceof Promise) {
      this.tasks.push(task)
    }
  }
}

class ParserTransform extends Transform {
  constructor (file, rule, options, tasks, parser) {
    super()

    this._source = ''
    this._file = file
    this._rule = rule
    this._options = options
    this._parser = parser
    this._tasks = tasks
  }

  _transform (buffer, encodeType, callback) {
    this._source += buffer
    callback()
  }

  _flush (callback) {
    let source = this._source
    let rule = this._rule
    let parser = this._parser

    forEach(rule.loaders, ({ use: module, options }) => {
      options = parser.options.connect(options)

      let transformer = require(module)
      transformer = transformer.default || transformer

      source = transformer(source, options, this)
    })

    this.push(source)
    callback()
  }
}

export default class Parser {
  constructor (assets, options) {
    this.options = options instanceof OptionManager ? options : new OptionManager(options)
    this.assets = assets instanceof Assets ? assets : new Assets(this.options)
  }

  parse (file, rule, options = {}) {
    if (this.assets.exists(file)) {
      return Promise.resolve(null)
    }

    this.assets.add(file, rule)

    return new Promise((resolve, reject) => {
      let taskManager = new TaskManager()
      let destination = this.assets.output(file)
      fs.ensureFileSync(destination)

      let readStream = fs.createReadStream(file)
      let writeStream = fs.createWriteStream(destination)
      let transStream = new ParserTransform(file, rule, options, taskManager, this)

      readStream = readStream.pipe(transStream)

      let size = 0
      readStream.on('data', (buffer) => {
        size += buffer.byteLength
      })

      readStream.on('end', () => {
        let stats = {
          assets: destination,
          size: size
        }

        Promise
          .all(taskManager.tasks)
          .then((allStats) => resolve(allStats.concat(stats)))
          .catch(reject)
      })

      readStream.pipe(writeStream)
    })
  }
}
