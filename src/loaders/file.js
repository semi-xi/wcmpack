import path from 'path'
import trimStart from 'lodash/trimStart'
import trimEnd from 'lodash/trimEnd'
import findIndex from 'lodash/findIndex'
import { genFileSync } from '../share/hash'
import { Transformer } from './transformer'

const WXMLImageRegExp = /<image[^>]+.*?src=["']?([^"'\s]+)["']?.*?\s*(\/>|><\/image>)/ig
const WXSSImageRegExp = /url\(["']?([^"'\s]+)["']?\)/ig
const RequireRegExp = /require\(["']?([^"'\s]+)["']?\)/ig

const FileMatchRegExps = {
  '.html': WXMLImageRegExp,
  '.wxml': WXMLImageRegExp,
  '.wxss': WXSSImageRegExp,
  '.css': WXSSImageRegExp,
  '.scss': WXSSImageRegExp,
  '.js': RequireRegExp,
  '.wxs': {
    regexp: RequireRegExp,
    replace (source, string, url) {
      return source.replace(string, `'${url}'`)
    }
  }
}

export class FileTransformer extends Transformer {
  constructor (options, file, assets, dependencies, parser) {
    super(options, file, assets, dependencies, parser)
    this.FileMatchRegExps = Object.assign({}, this._options.rules, FileMatchRegExps)
  }

  _flush (done) {
    try {
      let { _assets: assets, _file: file, _dependencies: dependencies, _parser: parser } = this
      let { rootDir, srcDir, staticDir, pubPath } = this._options
      let directory = path.dirname(file)
      let extname = path.extname(file)
      let { FileMatchRegExps, _source: source, _source: code } = this
      let regexp = FileMatchRegExps[extname]
      let files = []

      if (!regexp) {
        this.push(source)
        done()
        return
      }

      let replacement = function (source, string, url, regexp) {
        return source.replace(new RegExp(string, 'g'), () => {
          return string.replace(regexp, (string, file) => {
            return string.replace(file, url)
          })
        })
      }

      if (!(regexp instanceof RegExp)) {
        replacement = regexp.replace
        regexp = regexp.regexp
      }

      // eslint-disable-next-line no-unmodified-loop-condition
      while (regexp instanceof RegExp) {
        let match = regexp.exec(code)
        if (!match) {
          break
        }

        let [string, relativePath] = match
        code = code.replace(new RegExp(string, 'g'), '')

        if (/^data:([\w/]+?);base64,/.test(relativePath)) {
          continue
        }

        if (/^https?:\/\//.test(relativePath)) {
          continue
        }

        let filename = path.basename(relativePath)
        let extname = path.extname(filename)
        if (!extname || FileMatchRegExps.hasOwnProperty(extname)) {
          continue
        }

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

        let basename = path.basename(filename).replace(extname, '')
        filename = basename + '.' + genFileSync(file) + extname

        let destination = path.join(staticDir, filename)
        if (findIndex(files, file) === -1) {
          files.push({ file, destination })
        }

        let url = trimEnd(pubPath, '/') + '/' + trimStart(destination.replace(staticDir, ''), '/')
        source = replacement(source, string, url, regexp)
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
