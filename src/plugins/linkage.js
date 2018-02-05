import path from 'path'
import { parse } from '../parser'
import { resolveDependencies } from '../share/resolveDependencies'
import { rootDir, srcDir, distDir, nodeModuleName } from '../share/configuration'

export default function linkage (source, options, callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('Callback is not a function or not provided')
  }

  let file = options.file
  let relativeTo = path.dirname(file)
  let relativePath = file.search(srcDir) !== -1
    ? path.dirname(file).replace(srcDir, '')
    : /[\\/]node_modules[\\/]/.test(file)
      ? path.dirname(file).replace(path.join(rootDir, 'node_modules'), nodeModuleName)
      : path.dirname(file).replace(rootDir, '')
  let destination = path.join(distDir, relativePath, path.basename(file))
  let directory = path.dirname(destination)
  let dependencies = resolveDependencies(source, file, relativeTo)

  dependencies.filter(({ destination: file, required }) => {
    let relativePath = path.relative(directory, file)
    if (relativePath.charAt(0) !== '.') {
      relativePath = `./${relativePath}`
    }

    relativePath = relativePath.replace('node_modules', nodeModuleName)
    source = source.replace(new RegExp(`require\\(['"]${required}['"]\\)`, 'gm'), `require('${relativePath.replace(/\.\w+$/, '')}')`)

    dependencies.forEach(({ dependency }) => this.addChunks((callback) => parse(dependency, options, callback)))
  })

  callback(null, source)
}
