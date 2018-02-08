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
    let template = 'panels/sprite.scss.template.handlebars'
    let filename = 'sprite.png'
    let scssFilename = 'sprite.scss'
    this.options = Object.assign({ template, filename, scssFilename }, options)
  }

  initiate (optionManager = {}) {
    let options = optionManager.connect(this.options)

    let {
      srcDir, staticDir, tmplDir, pubPath,
      template, filename, scssFilename
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
        forEach(coordinates, (data, filename) => {
          let name = path.basename(filename).replace(path.extname(filename), '')
          let prop = { name, total_width: properties.width, total_height: properties.height }
          sprites.push(Object.assign(prop, data))
        })

        let imageFile = path.join(staticDir, filename)
        let scssFile = path.join(tmplDir, scssFilename)
        let image = path.join(pubPath, filename)
        let spritesheet = Object.assign({ image }, properties)
        let source = SpritesmithTemplate({ sprites, spritesheet }, { format: 'spriteScssTemplate' })

        fs.ensureDirSync(staticDir)
        fs.ensureDirSync(tmplDir)

        Promise.all([
          promisifyWriteFile(imageFile, buffer),
          promisifyWriteFile(scssFile, source)
        ])
          .then(() => {
            let stats = [
              {
                assets: imageFile,
                size: source.length
              },
              {
                assets: scssFile,
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
