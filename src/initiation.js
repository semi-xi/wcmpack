import { find } from './share/finder'
import Assets from './assets'
import Chunk from './chunk'
import OptionManager from './optionManager'

export default class Initiation {
  constructor (assets, options) {
    this.options = options instanceof OptionManager ? options : new OptionManager(options)
    this.assets = assets instanceof Assets ? assets : new Assets(assets)
  }

  initiate (options = {}) {
    options = this.options.connect(options)

    let { srcDir } = options
    let files = find(srcDir, /\.(json)$/)
    return this.copy(files, options)
  }

  copy (files, options = {}) {
    options = this.options.connect(options)

    let chunks = files.map((file) => {
      this.assets.add(file)
      return new Chunk(file, options)
    })

    return Promise.all(chunks)
  }
}
