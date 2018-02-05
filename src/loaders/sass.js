import { Transform } from 'stream'
import { renderSync } from 'node-sass'

export default class SassParser extends Transform {
  constructor (options = {}) {
    super()

    this._file = options.file
    this._source = ''
    this._settings = Object.assign({
      outputStyle: 'compressed',
      sourceComments: false,
      sourceMap: false
    }, options)
  }

  _transform (buffer, encodeType, callback) {
    this._source += buffer
    callback()
  }

  _flush (callback) {
    let file = this._file
    let data = this._source
    let options = Object.assign({}, this._settings, { file, data })
    let { css: code } = renderSync(options)
    this.push(code)
    callback()
  }
}
