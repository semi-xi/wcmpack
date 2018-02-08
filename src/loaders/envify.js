import envify from 'loose-envify/replace'

export default function EnvifyTransform (source, options) {
  source = source.toString()

  options = Object.assign({ env: process.env }, options)

  let env = Object.assign({}, process.env, options.env)
  return envify(source, [env || process.env])
}
