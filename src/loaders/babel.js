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
    try {
      let { code } = transformBabel(this._source, this._babelOptions)
      let regexp = /require\(["'\s]+(.+?)["'\s]+\)/g
      let surplus = code
      let match = null

      // eslint-disable-next-line no-cond-assign
      while (match = regexp.exec(surplus)) {
        let [all, path] = match
        surplus = surplus.replace(all, '')
        code = code.replace(all, `require('${path.replace(/\\/g, '/')}')`)
      }

      this.push(code)
    } catch (error) {
      this.emit('error', error)
    }

    done()
  }
}

export default function transform (stream, ...args) {
  return stream.pipe(new BabelTransformer(...args))
}
