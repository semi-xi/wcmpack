import fs from 'fs-extra'
import { find } from '../share/finder'

export default class CopyPlugin {
  constructor (options) {
    let pattern = /\.(png|jpe?g)$/
    this.options = Object.assign({ pattern }, options)
  }

  initiate (optionManager) {
    let options = optionManager.connect(this.options)
    let { pattern, srcDir, staticDir } = options
    let files = find(srcDir, pattern)
    let tasks = files.map((file) => new Promise((resolve) => {
      let destination = file.replace(srcDir, staticDir)
      fs.ensureFileSync(destination)

      let readStream = fs.createReadStream(file)
      let writeStream = fs.createWriteStream(destination)

      let size = 0
      readStream.on('data', (buffer) => {
        size += buffer.byteLength
      })

      readStream.on('end', function () {
        let stats = {
          assets: destination,
          size: size
        }

        resolve(stats)
      })

      readStream.pipe(writeStream)
    }))

    return Promise.all(tasks)
  }
}
