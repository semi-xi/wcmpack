import fs from 'fs-extra'
import path from 'path'
import { find } from '../share/finder'

export default class CopyPlugin {
  constructor (options = {}) {
    if (!(options.pattern && options.pattern instanceof RegExp)) {
      throw new TypeError('Pattern is not valid or not be provied')
    }

    let directory = path.join(process.cwd(), 'src/panels')
    let output = './panels'
    this.options = Object.assign({ directory, output }, options)
  }

  initiate (optionManager) {
    let options = optionManager.connect(this.options)
    let { pattern, directory, staticDir, output } = options
    let files = find(directory, pattern)
    let tasks = files.map((file) => new Promise((resolve, reject) => {
      let readStream = fs.createReadStream(file)
      let size = 0
      readStream.on('data', (buffer) => {
        size += buffer.byteLength
      })

      readStream.on('error', (error) => {
        reject(error)
        readStream.end()
      })

      let destination = file.replace(directory, path.join(staticDir, output))
      fs.ensureFileSync(destination)
      let writeStream = fs.createWriteStream(destination)
      writeStream.on('finish', function () {
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
