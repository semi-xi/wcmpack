import { render } from 'node-sass'
import { Transformer } from './transformer'

const defaultSettings = {
  outputStyle: 'compressed',
  sourceComments: false,
  sourceMap: false
}

export class SassTransformer extends Transformer {
  _flush (done) {
    let file = this._file
    let options = this._options
    let data = { file, data: this._source }

    options = Object.assign({}, defaultSettings, options, data)

    render(options, (error, source) => {
      if (error) {
        this.emit('error', error)
        done()
        return
      }

      let { css: code } = source
      this.push(code)
      done()
    })
  }
}

export default function transform (stream, ...args) {
  return stream.pipe(new SassTransformer(...args))
}
