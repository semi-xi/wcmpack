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
      let destination = file.replace(directory, path.join(staticDir, output))
      fs.ensureFileSync(destination)

      let readStream = fs.createReadStream(file)
      let writeStream = fs.createWriteStream(destination)

      let size = 0
      readStream.on('data', (buffer) => {
        size += buffer.byteLength
      })

      readStream.on('error', (error) => {
        reject(error)
        readStream.end()
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
