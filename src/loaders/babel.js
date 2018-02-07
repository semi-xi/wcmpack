import fs from 'fs-extra'
import path from 'path'
import { transform } from 'babel-core'

export default function BabelTransform (source, options, { argv }) {
  let { root: rootDir } = argv.options
  let babelrc = path.join(rootDir, '.babelrc')

  if (fs.existsSync(babelrc)) {
    options = Object.assign({}, options, { extends: babelrc, babelrc: true })
  }

  let { code } = transform(source, options)
  return code
}
