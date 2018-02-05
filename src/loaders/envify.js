import { Transform } from 'stream'
import envify from 'loose-envify/replace'

export default class EnvifyParser extends Transform {
  constructor (options = {}) {
    super()

    this._source = ''
    this._settings = Object.assign({ env: process.env }, options)
  }

  _transform (buffer, encodeType, callback) {
    this._source += buffer
    callback()
  }

  _flush (callback) {
    let env = Object.assign({}, process.env, this._settings.env)
    let code = envify(this._source, [env || process.env])
    this.push(code)
    callback()
  }
}
