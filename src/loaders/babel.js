import fs from 'fs-extra'
import path from 'path'
import { transform as transformBabel } from 'babel-core'
import { Transformer } from './transformer'

export class BabelTransformer extends Transformer {
  constructor (options, ...args) {
    super(options, ...args)

    let babelRcFile = path.join(options.rootDir, '.babelrc')
    let babelOptions = {}

    if (fs.existsSync(babelRcFile)) {
      babelOptions = Object.assign({}, options, {
        extends: babelRcFile,
        babelrc: true
      })
    }

    this._babelOptions = babelOptions
  }

  _flush (done) {
    let { code } = transformBabel(this._source, this._babelOptions)
    this.push(code)

    done()
  }
}

export default function transform (stream, ...args) {
  return stream.pipe(new BabelTransformer(...args))
}
