import fs from 'fs-extra'
import path from 'path'
import forEach from 'lodash/forEach'
import trimStart from 'lodash/trimStart'
import trimEnd from 'lodash/trimEnd'
import Spritesmith from 'spritesmith'
import SpritesmithTemplate from 'spritesheet-templates'
import { find } from '../share/finder'
import { gen } from '../share/hash'

export default class SpriteSmithPlugin {
  constructor (options = {}) {
    let directory = 'sprites'
    let imageFile = 'sprites/sprite.png'
    let styleFile = 'sprites/sprite.scss'
    let template = 'sprite.scss.template.handlebars'
    this.options = Object.assign({ imageFile, styleFile, directory, template }, options)
  }

  beforeInitiate (assets, optionManager, printer) {
    let options = optionManager.connect(this.options)

    let {
      srcDir, tmplDir, pubPath,
      template, imageFile, styleFile, directory
    } = options

    directory = path.join(srcDir, directory)
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

        let image = trimEnd(pubPath, '/') + '/' + trimStart(imageFile, '/')
        let spritesheet = Object.assign({ image }, properties)
        let source = SpritesmithTemplate({ sprites, spritesheet }, { format: 'spriteScssTemplate' })

        let StyleFile = path.join(tmplDir, styleFile)
        fs.ensureFileSync(StyleFile)
        fs.writeFileSync(StyleFile, source)

        let { chunk } = assets.add(imageFile, {
          type: 'static',
          content: buffer,
          destination: imageFile
        })

        resolve([chunk])
      })
    })
  }
}
