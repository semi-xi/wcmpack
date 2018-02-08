import path from 'path'
import localip from 'local-ip'
import mapValues from 'lodash/mapValues'

export default class OptionsManager {
  constructor (options = {}) {
    this.rootDir = process.cwd()
    this.execDir = path.join(__dirname, '../')
    this.srcDir = path.join(this.rootDir, options.src || 'src')
    this.outDir = path.join(this.rootDir, options.output || 'app')
    this.staticDir = path.join(this.rootDir, options.static || 'static')
    this.tmplDir = path.join(this.rootDir, options.tmpl || '.temporary')
    this.pubPath = options.publicPath || `http://${localip()}:3000`
    this.npmDir = options.nodeModuleDirectoryName || 'npm'
    this.rules = options.rules || []
  }

  connect (options) {
    let getter = mapValues(this, (value, name) => ({
      get: () => this[name]
    }))

    options = Object.assign({}, options)
    return Object.defineProperties(options, getter)
  }
}
