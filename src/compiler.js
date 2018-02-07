import map from 'lodash/map'
import flattenDeep from 'lodash/flattenDeep'
import Assets from './assets'
import OptionManager from './optionManager'
import Parser from './parser'
import { findForMatchRules } from './share/finder'

export default class Compiler {
  constructor (assets, options) {
    this.options = options instanceof OptionManager ? options : new OptionManager(options)
    this.assets = assets instanceof Assets ? assets : new Assets(this.options)
  }

  transform (options = {}) {
    this.assets.reset()

    options = this.options.connect(options)
    let { srcDir, rules } = options

    let parser = new Parser(this.assets, this.options)
    let rulesToFile = findForMatchRules(srcDir, rules)
    let tasks = map(rulesToFile, (rules, file) => parser.parse(file, rules[0], options))

    return Promise.all(tasks).then((stats) => flattenDeep(stats).filter((stats) => stats))
  }
}
