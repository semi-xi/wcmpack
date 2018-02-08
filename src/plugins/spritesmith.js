import fs from 'fs-extra'
import path from 'path'
import { promisify } from 'util'
import forEach from 'lodash/forEach'
import trimStart from 'lodash/trimStart'
import trimEnd from 'lodash/trimEnd'
import Spritesmith from 'spritesmith'
import SpritesmithTemplate from 'spritesheet-templates'
import { find } from '../share/finder'
import { gen } from '../share/hash'

const promisifyWriteFile = promisify(fs.writeFile.bind(fs))

export default class SpriteSmithPlugin {
  constructor (options = {}) {
    let directory = path.join(process.cwd(), 'src/sprites')
    let imageFile = 'sprites/sprite.png'
    let styleFile = 'sprites/sprite.scss'
    let template = 'sprite.scss.template.handlebars'
    this.options = Object.assign({ imageFile, styleFile, directory, template }, options)
  }

  initiate (optionManager) {
    let options = optionManager.connect(this.options)

    let {
      staticDir, tmplDir, pubPath,
      template, imageFile, styleFile, directory
    } = options

    template = path.join(directory, template)
    if (!(template && fs.existsSync(template))) {
      return Promise.reject(new Error(`Template ${template} is not found or not be provied`))
    }

    let source = fs.readFileSync(template, 'utf8')
    SpritesmithTemplate.addHandlebarsTemplate('spriteScssTemplate', source)

    return new Promise((resolve, reject) => {
      let files = find(directory, /\.(png|jpe?g)$/)
      Spritesmith.run({ src: files }, function (error, result) {
        if (error) {
          if (error instanceof Error || error instanceof TypeError) {
            error = new Error(error)
          }

          reject(error)
          return
        }

        let { image: buffer, coordinates, properties } = result

        let sprites = []
        forEach(coordinates, (data, imageFile) => {
          let name = path.basename(imageFile).replace(path.extname(imageFile), '')
          let prop = { name, total_width: properties.width, total_height: properties.height }
          sprites.push(Object.assign(prop, data))
        })

        let filename = path.basename(imageFile)
        let extname = path.extname(imageFile)
        let basename = filename.replace(extname, '')
        imageFile = path.join(imageFile.replace(filename, ''), basename + '.' + gen(buffer) + extname)

        let _imageFile = path.join(staticDir, imageFile)
        let _styleFile = path.join(tmplDir, styleFile)

        let image = trimEnd(pubPath, '/') + '/' + trimStart(imageFile, '/')
        let spritesheet = Object.assign({ image }, properties)
        let source = SpritesmithTemplate({ sprites, spritesheet }, { format: 'spriteScssTemplate' })

        let imageDirectory = path.dirname(_imageFile)
        let styleDirectory = path.dirname(_styleFile)

        fs.ensureDirSync(imageDirectory)
        fs.ensureDirSync(styleDirectory)

        Promise.all([
          promisifyWriteFile(_imageFile, buffer),
          promisifyWriteFile(_styleFile, source)
        ])
          .then(() => {
            let stats = [
              {
                assets: _imageFile,
                size: source.length
              },
              {
                assets: _styleFile,
                size: buffer.byteLength
              }
            ]

            resolve(stats)
          })
          .catch(reject)
      })
    })
  }
}
