import fs from 'fs-extra'
import path from 'path'
import { promisify } from 'util'
import forEach from 'lodash/forEach'
import Spritesmith from 'spritesmith'
import SpritesmithTemplate from 'spritesheet-templates'
import { find } from '../share/finder'

const promisifyWriteFile = promisify(fs.writeFile.bind(fs))

export default class SpriteSmithPlugin {
  constructor (options) {
    let template = 'sprites/sprite.scss.template.handlebars'
    let imageFile = 'sprites/sprite.png'
    let styleFile = 'sprites/sprite.scss'
    this.options = Object.assign({ template, imageFile, styleFile }, options)
  }

  initiate (optionManager) {
    let options = optionManager.connect(this.options)

    let {
      srcDir, staticDir, tmplDir, pubPath,
      template, imageFile, styleFile
    } = options

    template = path.join(srcDir, template)
    if (!(template && fs.existsSync(template))) {
      return Promise.reject(new Error(`Template ${template} is not found or not be provied`))
    }

    let source = fs.readFileSync(template, 'utf8')
    SpritesmithTemplate.addHandlebarsTemplate('spriteScssTemplate', source)

    return new Promise((resolve, reject) => {
      let files = find(srcDir, /\.(png|jpe?g)$/)
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

        let _imageFile = path.join(staticDir, imageFile)
        let _styleFile = path.join(tmplDir, styleFile)
        let image = path.join(pubPath, _imageFile)
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
