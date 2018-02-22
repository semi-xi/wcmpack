import fs from 'fs-extra'
import path from 'path'
import { PassThrough } from 'stream'
import OptionManager from './optionManager'

export default class Chunk {
  constructor (file, options = { type: 'file' }, globalOptions) {
    if (!file) {
      throw new TypeError('File is not be provided')
    }

    if (!fs.existsSync(file)) {
      if (!options.content) {
        throw new Error(`File ${file} is not found`)
      }

      let buffer = Buffer.from(options.content, 'utf8')
      this.stream = new PassThrough()
      this.stream.end(buffer)
    } else {
      this.stream = fs.createReadStream(file)
    }

    this.file = file
    this.options = options
    this.globalOptions = globalOptions instanceof OptionManager ? globalOptions : new OptionManager(globalOptions)

    let { rootDir, srcDir, outDir, npmDir, staticDir } = this.globalOptions
    let { rule, destination } = this.options

    rule = rule || {}
    destination = destination || ''

    if (destination) {
      if (rule.extname) {
        let dirname = path.dirname(destination)
        let filename = path.basename(destination)
        let extname = path.extname(file)

        filename = filename.replace(extname, rule.extname)
        this.destination = path.join(dirname, filename)
      } else {
        this.destination = destination
      }
    } else {
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

      this.destination = path.join(rule.type === 'static' ? staticDir : outDir, relativePath, filename)
    }
  }

  pipe (loader, ...args) {
    return new Promise((resolve, reject) => {
      let { use, options } = loader
      let transform = require(use)

      options = this.globalOptions.connect(options)
      transform = transform.default || transform
      this.stream.on('end', resolve.bind(null, this))
      this.stream.on('error', reject.bind(null, this))
      this.stream = transform(this.stream, options, this.file, ...args)
    })
  }

  save (destination = this.destination) {
    if (!(typeof destination === 'string' && destination.length > 0)) {
      throw new TypeError('Destination is invlaid or not be provided')
    }

    return new Promise((resolve, reject) => {
      fs.ensureFileSync(destination)

      let writeStream = fs.createWriteStream(destination)

      let size = 0
      this.stream.on('data', (buffer) => {
        size += buffer.byteLength
      })

      this.stream.on('error', (error) => {
        reject(error)
        this.stream.end()
        this.destory()
      })

      writeStream.on('finish', () => {
        let stats = {
          assets: destination,
          size: size
        }

        resolve(stats)
        this.destory()
      })

      writeStream.on('error', (error) => {
        reject(error)
        writeStream.end()
        this.destory()
      })

      this.stream.pipe(writeStream)
    })
  }

  setDestination (destination) {
    this.destination = destination
  }

  destory () {
    if (this.stream && !this.stream._readableState.ended) {
      this.stream.close()
    }

    this.file = undefined
    this.destination = undefined
    this.options = undefined
    this.stream = undefined
    this.globalOptions = undefined

    delete this.file
    delete this.destination
    delete this.options
    delete this.stream
    delete this.globalOptions
  }
}
