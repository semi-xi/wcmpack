import UglifyJS from 'uglify-js'
import { Transformer } from './transformer'

export class UglifyTransformer extends Transformer {
  _flush (done) {
    let { error, code } = UglifyJS.minify(this._source)
    error ? this.emit('error', error) : this.push(code)
    done()
  }
}

export default function transform (stream, ...args) {
  return stream.pipe(new UglifyTransformer(...args))
}
