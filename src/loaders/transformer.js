import { Transform } from 'stream'

export class Transformer extends Transform {
  constructor (options, file, assets, dependencies, parser) {
    super()

    this._source = ''
    this._options = options
    this._file = file
    this._assets = assets
    this._dependencies = dependencies
    this._parser = parser
  }

  _transform (buffer, encodeType, done) {
    this._source += buffer
    done()
  }
}
