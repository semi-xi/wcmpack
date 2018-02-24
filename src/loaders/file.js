import path from 'path'
import trimStart from 'lodash/trimStart'
import trimEnd from 'lodash/trimEnd'
import findIndex from 'lodash/findIndex'
import { genFileSync } from '../share/hash'
import { Transformer } from './transformer'

const WXMLImageRegExp = /<image[^>]+.*?src=["']?([^"'\s]+)["']?.*?\s*(\/>|><\/image>)/ig
const WXSSImageRegExp = /url\(["']?([^"'\s]+)["']?\)/ig
const FileMatchRegExps = {
  '.html': WXMLImageRegExp,
  '.css': WXSSImageRegExp,
  '.wxml': WXMLImageRegExp,
  '.wxss': WXSSImageRegExp,
  '.scss': WXSSImageRegExp
}

export class FileTransformer extends Transformer {
  _flush (done) {
    try {
      let { _assets: assets, _file: file, _dependencies: dependencies, _parser: parser } = this
      let { rootDir, srcDir, staticDir, pubPath } = this._options
      let directory = path.dirname(file)
      let extname = path.extname(file)
      let source = this._source
      let code = this._source
      let files = []
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
        if (findIndex(files, file) === -1) {
          files.push({ file, destination })
        }

        let url = trimEnd(pubPath, '/') + '/' + trimStart(destination.replace(staticDir, ''), '/')
        source = source.replace(string, () => {
          return string.replace(regexp, (string, file) => {
            return string.replace(file, url)
          })
        })
      }

      files.forEach(({ file, destination }) => {
        if (assets.exists(file)) {
          let chunk = assets.getChunk(file)
          chunk.setDestination(destination)
        } else {
          let task = parser.parse(file, {}, Object.assign({ type: 'static', destination }, this._options))
          dependencies.push(task)
        }
      })

      this.push(source)
    } catch (error) {
      this.emit('error', error)
    }

    done()
  }
}

export default function transform (stream, ...args) {
  return stream.pipe(new FileTransformer(...args))
}
