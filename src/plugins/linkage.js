import path from 'path'
import { parse } from '../parser'
import { resolveDependencies } from '../share/resolveDependencies'
import { rootDir, srcDir, distDir, nodeModuleName } from '../share/configuration'

export default function linkage (assets, options = {}) {
  let { file, source, rule, config } = assets
  source = source.toString()

  let relativeTo = path.dirname(file)
  let relativePath = ''
  if (file.search(srcDir) !== -1) {
    relativePath = path.dirname(file).replace(srcDir, '')
  } else if (/[\\/]node_modules[\\/]/.test(file)) {
    relativePath = path.dirname(file).replace(path.join(rootDir, 'node_modules'), nodeModuleName)
  } else {
    relativePath = path.dirname(file).replace(rootDir, '')
  }

  let destination = path.join(distDir, relativePath, path.basename(file))
  let directory = path.dirname(destination)
  let dependencies = resolveDependencies(source, file, relativeTo)

  let tasks = []
  dependencies.forEach(({ dependency, destination: file, required }) => {
    let relativePath = path.relative(directory, file)
    if (relativePath.charAt(0) !== '.') {
      relativePath = `./${relativePath}`
    }

    relativePath = relativePath.replace('node_modules', nodeModuleName)
    source = source.replace(new RegExp(`require\\(['"]${required}['"]\\)`, 'gm'), `require('${relativePath.replace(/\.\w+$/, '')}')`)

    assets.source = source
    tasks.push(parse(dependency, rule, config))
  })

  return Promise.all(tasks)
}
