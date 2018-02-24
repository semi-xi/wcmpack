import envify from 'loose-envify/replace'
import { Transformer } from './transformer'

export class EnvifyTransformer extends Transformer {
  _flush (done) {
    try {
      let options = Object.assign({ env: process.env }, this._options)
      let env = Object.assign({}, process.env, options.env)
      let code = envify(this._source, [env || process.env])
      this.push(code)
    } catch (error) {
      this.emit('error', error)
    }

    done()
  }
}

export default function transform (stream, ...args) {
  return stream.pipe(new EnvifyTransformer(...args))
}
