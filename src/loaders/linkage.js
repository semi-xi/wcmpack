import path from 'path'
import forEach from 'lodash/forEach'
import Parser from '../parser'
import { findForMatchRules } from '../share/finder'
import { resolveDependencies } from '../share/resolveDependencies'
import { nodeModuleName } from '../share/configuration'

export default function ReuqireTransform (source, options, transformer) {
  let file = transformer._file
  let parser = transformer._parser
  let tasks = transformer._tasks

  let relativeTo = path.dirname(file)
  let dependencies = resolveDependencies(source, file, relativeTo, options)

  let destination = parser.assets.output(file)
  let directory = path.dirname(destination)

  forEach(dependencies, ({ dependency, destination: file, required }) => {
    let relativePath = path.relative(directory, file)
    if (relativePath.charAt(0) !== '.') {
      relativePath = `./${relativePath}`
    }

    relativePath = relativePath.replace('node_modules', nodeModuleName)
    source = source.replace(new RegExp(`require\\(['"]${required}['"]\\)`, 'gm'), `require('${relativePath.replace(/\.\w+$/, '')}')`)

    let subParser = new Parser(parser.assets, parser.options)
    let rulesToFile = findForMatchRules(dependency, options.rules)

    forEach(rulesToFile, (rules, file) => {
      let task = subParser.parse(file, rules[0], options)
      tasks.addTask(task)
    })
  })

  return source
}
