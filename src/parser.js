import fs from 'fs-extra'
import Assets from './assets'
import OptionManager from './optionManager'
import Printer from './printer'
import ParserTransform from './parserTransform'
import TaskManager from './taskManager'

export default class Parser {
  constructor (assets, options, printer) {
    this.options = options instanceof OptionManager ? options : new OptionManager(options)
    this.assets = assets instanceof Assets ? assets : new Assets(this.options)
    this.printer = printer instanceof Printer ? printer : new Printer(this.options)
  }

  parse (file, rule, options = {}) {
    if (this.assets.exists(file)) {
      return Promise.resolve(null)
    }

    this.assets.add(file, rule)

    return new Promise((resolve, reject) => {
      let taskManager = new TaskManager()
      let readStream = fs.createReadStream(file)
      let size = 0
      readStream.on('data', (buffer) => {
        size += buffer.byteLength
      })

      readStream.on('error', (error) => {
        reject(error)
        readStream.end()
      })

      let transStream = new ParserTransform(file, rule, options, taskManager, this)
      readStream = readStream.pipe(transStream)

      let destination = this.assets.output(file)
      fs.ensureFileSync(destination)
      let writeStream = fs.createWriteStream(destination)
      writeStream.on('finish', () => {
        let stats = {
          assets: destination,
          size: size
        }

        taskManager
          .execute()
          .then((allStats) => resolve(allStats.concat(stats)))
          .catch(reject)
      })

      readStream.pipe(writeStream)
    })
  }
}
