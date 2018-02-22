import map from 'lodash/map'
import series from 'async/series'
import asyncify from 'async/asyncify'
import Assets from './assets'
import OptionManager from './optionManager'
import Printer from './printer'

export default class Parser {
  constructor (assets, options, printer) {
    this.options = options instanceof OptionManager ? options : new OptionManager(options)
    this.assets = assets instanceof Assets ? assets : new Assets(this.options)
    this.printer = printer instanceof Printer ? printer : new Printer(this.options)
  }

  parse (file, rule, options = {}) {
    let { assets } = this
    if (assets.exists(file)) {
      return Promise.resolve(null)
    }

    let { chunk } = assets.add(file, Object.assign({ rule }, options))

    return new Promise((resolve, reject) => {
      options = this.options.connect(options)

      let dependencies = []
      let tasks = map(rule.loaders, (loader) => {
        let fn = chunk.pipe.bind(chunk, loader, assets, dependencies, this)
        return asyncify(fn)
      })

      series(tasks, (error) => {
        if (error) {
          reject(error)
          return
        }

        Promise
          .all(dependencies)
          .then((subChunks) => resolve([chunk].concat(subChunks)))
          .catch(reject)
      })
    })
  }
}
