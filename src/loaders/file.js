import fs from 'fs-extra'
import path from 'path'
import colors from 'colors'
import trimStart from 'lodash/trimStart'
import trimEnd from 'lodash/trimEnd'
import forEach from 'lodash/forEach'
import { genFileSync } from '../share/hash'

const WXMLImageRegExp = /<image[^>]+.*?src=["']?([^"'\s]+)["']?.*?\s*(\/>|><\/image>)/ig
const WXSSImageRegExp = /url\(["']?([^"'\s]+)["']?\)/ig
const FileMatchRegExps = {
  '.html': WXMLImageRegExp,
  '.css': WXSSImageRegExp,
  '.wxml': WXMLImageRegExp,
  '.wxss': WXSSImageRegExp,
  '.scss': WXSSImageRegExp
}

export default function FileTransform (source, options, transformer) {
  source = source.toString()

  let { rootDir, srcDir, staticDir, pubPath } = options
  let file = transformer._file
  let taskManager = transformer._taskManager
  let printer = transformer._printer
  let directory = path.dirname(file)
  let extname = path.extname(file)
  let code = source
  let files = {}
  let regexp = FileMatchRegExps[extname]

  while (true) {
    let match = regexp.exec(code)
    if (!match) {
      break
    }

    let [string, relativePath] = match
    code = code.replace(string, '')

    if (/^data:([\w/]+?);base64,/.test(relativePath)) {
      continue
    }

    if (/^https?:\/\//.test(relativePath)) {
      continue
    }

    let filename = path.basename(relativePath)
    let file = ''
    switch (relativePath.charAt(0)) {
      case '~':
        file = path.join(srcDir, relativePath)
        break
      case '/':
        file = path.join(rootDir, relativePath)
        break
      case '.':
        file = path.join(directory, relativePath)
        break
      default:
        continue
    }

    let extname = path.extname(filename)
    let basename = path.basename(filename).replace(extname, '')
    filename = basename + '.' + genFileSync(file) + extname

    let destination = path.join(staticDir, filename)
    if (!files[file]) {
      files[file] = destination
    }

    let url = trimEnd(pubPath, '/') + '/' + trimStart(destination.replace(staticDir, ''), '/')
    source = source.replace(string, () => {
      return string.replace(regexp, (string, file) => {
        return string.replace(file, url)
      })
    })
  }

  forEach(files, (destination, file) => {
    if (!fs.existsSync(file)) {
      printer.layze(colors.yellow(`File ${colors.bold(file)} is not found`))
      return
    }

    if (fs.statSync(file).isDirectory()) {
      printer.layze(colors.yellow(`File ${colors.bold(file)} is directory not a file`))
      return
    }

    taskManager.addTask(new Promise((resolve, reject) => {
      let readStream = fs.createReadStream(file)
      let size = 0
      readStream.on('data', (buffer) => {
        size += buffer.length
      })

      readStream.on('error', (error) => {
        reject(error)
        readStream.end()
      })

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
    }))
  })

  return source
}
