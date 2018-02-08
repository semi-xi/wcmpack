import UglifyJS from 'uglify-js'

export default function UglifyTransform (source) {
  source = source.toString()

  let { error, code } = UglifyJS.minify(source)

  if (error) {
    if (error instanceof Error || error instanceof TypeError) {
      throw error
    }

    throw new Error(error)
  }

  return code
}
