import { Transform } from 'stream'
import UglifyJS from 'uglify-js'

export default class UglifyParser extends Transform {
  constructor (options = {}) {
    super()

    this._source = ''
    this._settings = options
  }

  _transform (buffer, encodeType, callback) {
    this._source += buffer
    callback()
  }

  _flush (callback) {
    let { error, code } = UglifyJS.minify(this._source)
    if (error) {
      throw error
    }

    this.push(code)
    callback()
  }
}
