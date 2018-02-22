import UglifyJS from 'uglify-js'
import { Transformer } from './transformer'

export class UglifyTransformer extends Transformer {
  _flush (done) {
    let { error, code } = UglifyJS.minify(this._source)

    if (error) {
      if (error instanceof Error || error instanceof TypeError) {
        throw error
      }

      throw new Error(error)
    }

    this.push(code)
    done()
  }
}

export default function transform (stream, ...args) {
  return stream.pipe(new UglifyTransformer(...args))
}
