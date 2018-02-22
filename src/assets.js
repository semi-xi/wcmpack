import findIndex from 'lodash/findIndex'
import OptionManager from './optionManager'
import Chunk from './chunk'

export default class Assets {
  constructor (options) {
    this.options = options instanceof OptionManager ? options : new OptionManager(options)
    this.assets = []
  }

  index (file) {
    return findIndex(this.assets, { file })
  }

  add (file, options = {}) {
    options = this.options.connect(options)

    let chunk = new Chunk(file, options, this.options)
    let assets = { file, chunk }
    this.assets.push(assets)
    return assets
  }

  get (file) {
    let index = this.index(file)
    return index !== -1 ? this.assets[index] : null
  }

  getChunk (file) {
    let assets = this.get(file) || {}
    return assets.chunk
  }

  del (file) {
    let index = this.index(file)
    index !== -1 && this.splice(index, 1)
  }

  exists (file) {
    return this.index(file) !== -1
  }

  output (file) {
    let chunk = this.getChunk(file) || {}
    return chunk.destination
  }

  reset () {
    this.assets.splice(0).forEach(({ file, chunk }) => chunk.destory())
    this.assets = []
  }
}
