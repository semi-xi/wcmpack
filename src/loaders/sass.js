import { renderSync } from 'node-sass'

const defaultSettings = {
  outputStyle: 'compressed',
  sourceComments: false,
  sourceMap: false
}

export default function SassTransform (source, options, { argv }) {
  let { file } = argv
  options = Object.assign(defaultSettings, options, { file, data: source })

  let { css: code } = renderSync(options)
  return code
}
