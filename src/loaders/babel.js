import fs from 'fs-extra'
import path from 'path'
import { transform } from 'babel-core'

export default function BabelTransform (source, options) {
  source = source.toString()

  let babelRcFile = path.join(options.rootDir, '.babelrc')
  let babelOptions = {}

  if (fs.existsSync(babelRcFile)) {
    babelOptions = Object.assign({}, options, {
      extends: babelRcFile,
      babelrc: true
    })
  }

  let { code } = transform(source, babelOptions)
  return code
}
