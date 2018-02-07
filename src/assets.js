import path from 'path'
import OptionManager from './optionManager'

export default class Assets {
  constructor (options) {
    this.options = options instanceof OptionManager ? options : new OptionManager(options)
    this.assets = {}
  }

  add (file, rule = {}) {
    let { rootDir, srcDir, outDir, npmDir } = this.options

    let relativePath = file.search(srcDir) !== -1
      ? path.dirname(file).replace(srcDir, '')
      : /[\\/]node_modules[\\/]/.test(file)
        ? path.dirname(file).replace(path.join(rootDir, 'node_modules'), npmDir)
        : path.dirname(file).replace(rootDir, '')

    let filename = path.basename(file)
    if (rule.extname) {
      let extname = path.extname(file)
      filename = filename.replace(extname, rule.extname)
    }

    let destination = path.join(outDir, relativePath, filename)
    this.assets[file] = { file, destination }
  }

  output (file) {
    let assets = this.assets[file] || {}
    return assets.destination
  }

  exists (file) {
    return !!this.assets[file]
  }

  reset () {
    this.assets = {}
  }
}
