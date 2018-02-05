import fs from 'fs-extra'
import path from 'path'
import { Transform } from 'stream'
import { transform } from 'babel-core'
import { rootDir } from '../share/configuration'

export default class BabelParser extends Transform {
  constructor (options = {}) {
    super()

    let babelrc = path.join(rootDir, '.babelrc')
    if (fs.existsSync(babelrc)) {
      options = Object.assign({}, options, { extends: babelrc, babelrc: true })
    }

    delete options.file

    this._source = ''
    this._settings = options
  }

  _transform (buffer, encodeType, callback) {
    this._source += buffer
    callback()
  }

  _flush (callback) {
    let { code } = transform(this._source, this._settings)
    this.push(code)
    callback()
  }
}
