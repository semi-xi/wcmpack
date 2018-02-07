import path from 'path'
import forEach from 'lodash/forEach'
import { findForMatch } from '../share/finder'
import { resolveDependencies } from '../share/resolveDependencies'
import { nodeModuleName } from '../share/configuration'

export default function ReuqireTransform (source, options, { compiler, parser, argv }) {
  let { file, options: parseOptions } = argv
  let { root: rootDir, src: srcDir, dist: distDir } = argv.options

  let relativeTo = path.dirname(file)
  let relativePath = file.search(srcDir) !== -1
    ? path.dirname(file).replace(srcDir, '')
    : /[\\/]node_modules[\\/]/.test(file)
      ? path.dirname(file).replace(path.join(rootDir, 'node_modules'), nodeModuleName)
      : path.dirname(file).replace(rootDir, '')

  let destination = path.join(distDir, relativePath, path.basename(file))
  let directory = path.dirname(destination)
  let dependencies = resolveDependencies(source, file, relativeTo)

  dependencies.forEach(({ dependency, destination: file, required }) => {
    let relativePath = path.relative(directory, file)
    if (relativePath.charAt(0) !== '.') {
      relativePath = `./${relativePath}`
    }

    relativePath = relativePath.replace('node_modules', nodeModuleName)
    source = source.replace(new RegExp(`require\\(['"]${required}['"]\\)`, 'gm'), `require('${relativePath.replace(/\.\w+$/, '')}')`)

    let files = findForMatch(dependency, parseOptions.rules)
    forEach(files, (rules, file) => {
      let task = compiler.parse(file, rules[0], parseOptions)
      parser.addTask(task)
    })
  })

  return source
}
