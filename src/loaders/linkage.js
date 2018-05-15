import path from 'path'
import forEach from 'lodash/forEach'
import { findForMatchRules } from '../share/finder'
import { resolveDependencies } from '../share/resolveDependencies'
import { Transformer } from './transformer'

export class LinkageTransformer extends Transformer {
  _flush (done) {
    try {
      let {
        _source: source,
        _options: options,
        _file: file,
        _assets: assets,
        _dependencies: dependenciesTasks,
        _parser: parser
      } = this

      let relativeTo = path.dirname(file)
      let dependencies = resolveDependencies(source, file, relativeTo, options)
      let destination = assets.output(file)
      let directory = path.dirname(destination)

      forEach(dependencies, ({ dependency, destination: file, required }) => {
        let extname = path.extname(file)
        if (extname !== '' && !/\.(jsx?|babel)/.test(extname)) {
          return
        }

        if (dependency === path.basename(dependency)) {
          return
        }

        let relativePath = path.relative(directory, file)
        if (relativePath.charAt(0) !== '.') {
          relativePath = `./${relativePath}`
        }

        relativePath = relativePath.replace('node_modules', options.npmDir)
        source = source.replace(new RegExp(`require\\(['"]${required}['"]\\)`, 'gm'), `require('${relativePath.replace(/\.\w+$/, '')}')`)

        let rulesToFile = findForMatchRules(dependency, options.rules)
        forEach(rulesToFile, (rules, file) => {
          let task = parser.parse(file, rules[0], options)
          dependenciesTasks.push(task)
        })
      })

      this.push(source)
    } catch (error) {
      this.emit('error', error)
    }

    done()
  }
}

export default function transform (stream, ...args) {
  return stream.pipe(new LinkageTransformer(...args))
}
