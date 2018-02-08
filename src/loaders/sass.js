import { renderSync } from 'node-sass'

const defaultSettings = {
  outputStyle: 'compressed',
  sourceComments: false,
  sourceMap: false
}

export default function SassTransform (source, options, transformer) {
  source = source.toString()

  let file = transformer._file
  let data = { file, data: source }

  options = Object.assign({}, defaultSettings, options, data)
  let { css: code } = renderSync(options)
  return code
}
