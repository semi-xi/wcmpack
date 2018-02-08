import fs from 'fs-extra'
import { find } from './share/finder'
import Assets from './assets'
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

    let tasks = files.map((file) => {
      this.assets.add(file)

      return new Promise((resolve, reject) => {
        let readStream = fs.createReadStream(file)
        let size = 0

        readStream.on('data', (buffer) => {
          size += buffer.length
        })

        readStream.on('error', (error) => {
          reject(error)
          readStream.end()
        })

        let destination = this.assets.output(file)
        fs.ensureFileSync(destination)
        let writeStream = fs.createWriteStream(destination)
        writeStream.on('finish', () => {
          let stats = {
            assets: destination,
            size: size
          }

          resolve(stats)
        })

        readStream.pipe(writeStream)
      })
    })

    return Promise.all(tasks)
  }
}
