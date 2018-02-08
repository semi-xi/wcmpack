import { Transform } from 'stream'
import forEach from 'lodash/forEach'

export default class ParserTransform extends Transform {
  constructor (file, rule, options, taskManager, parser) {
    super()

    this._source = ''
    this._file = file
    this._rule = rule
    this._options = options
    this._parser = parser
    this._taskManager = taskManager
    this._printer = parser.printer
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
