import fs from 'fs-extra'
import colors from 'colors'

const promisifyRemove = fs.remove.bind(fs)

export default class CleanerPlugin {
  constructor (options = {}) {
    this.options = Object.assign({}, options)
  }

  beforeInitiate (assets, optionManager, printer) {
    let options = optionManager.connect(this.options)
    let { outDir, staticDir, tmplDir } = options

    let tasks = [
      promisifyRemove(outDir),
      promisifyRemove(staticDir),
      promisifyRemove(tmplDir)
    ]

    return Promise
      .all(tasks)
      .then(() => {
        printer.trace(`${colors.bold(outDir)} has been removed`)
        printer.trace(`${colors.bold(staticDir)} has been removed`)
        printer.trace(`${colors.bold(tmplDir)} has been removed`)
      })
  }
}
