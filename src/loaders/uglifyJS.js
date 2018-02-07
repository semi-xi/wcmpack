import UglifyJS from 'uglify-js'

export default function UglifyTransform (source) {
  let { error, code } = UglifyJS.minify(source)
  if (error) {
    throw error
  }

  return code
}
