import { callbackify } from 'util'
import colors from 'colors'
import program from 'commander'
import chokidar from 'chokidar'
import map from 'lodash/map'
import flatten from 'lodash/flatten'
import parallel from 'async/parallel'
import series from 'async/series'
import OptionManager from '../optionManager'
import Assets from '../assets'
import Initiation from '../initiation'
import Compiler from '../compiler'
import Printer from '../printer'
import Package from '../../package.json'

export class CompileTask {
  constructor (options) {
    let configFile = options.config ? options.config : '../constants/development.config'
    let compileOptions = require(configFile)
    compileOptions = compileOptions.default || compileOptions

    this.options = options
    this.optionManager = new OptionManager(compileOptions)
    this.assets = new Assets(this.optionManager)
    this.printer = new Printer(this.optionManager)
    this.compiler = new Compiler(this.assets, this.optionManager, this.printer)
    this.initiation = new Initiation(this.assets, this.optionManager)
    this.compileOptions = this.optionManager.connect(compileOptions)
  }

  run (options = this.options) {
    let startTime = Date.now()

    let { watch: isWatchFiles } = options
    let { optionManager, printer, compiler, initiation, compileOptions } = this
    let { rootDir, srcDir, plugins } = compileOptions

    let handleCallbackTransform = (error, stats) => {
      stats = flatten(stats).filter((stats) => stats)
      stats.spendTime = Date.now() - startTime
      error ? this.caughtException(error) : this.printStats(stats, compileOptions, isWatchFiles)
    }

    let handleWatchFiles = () => {
      let handleFileChange = (path) => {
        startTime = Date.now()

        if (/\.(json|wxml)$/.test(path)) {
          printer.trace(`Assets file ${colors.bold(path.replace(rootDir, ''))} has been changed, copying...`)
          callbackifyCopyFile([path], compileOptions, handleCallbackTransform)
          return
        }

        printer.trace(`Source file ${colors.bold(path.replace(rootDir, ''))} has been changed, compiling...`)
        callbackifyTransform(compileOptions, handleCallbackTransform)
      }

      let handleFileUnlink = (path) => {
        if (/\.(json|wxml)$/.test(path)) {
          printer.trace(`Assets file ${colors.bold(path.replace(rootDir, ''))} has been deleted, ignore it`)
          return
        }

        printer.trace(`Source file ${path} has been changed, compiling...`)
        callbackifyTransform(compileOptions, handleCallbackTransform)
      }

      let watcher = chokidar.watch(srcDir)
      watcher.on('change', handleFileChange)
      watcher.on('unlink', handleFileUnlink)

      let handleProcessSigint = process.exit.bind(process)

      let handleProcessExit = function () {
        watcher && watcher.close()

        process.removeListener('exit', handleProcessExit)
        process.removeListener('SIGINT', handleProcessSigint)

        handleProcessExit = undefined
        handleProcessSigint = undefined
      }

      process.on('exit', handleProcessExit)
      process.on('SIGINT', handleProcessSigint)
    }

    let callbackifyInitiate = callbackify(initiation.initiate.bind(initiation))
    let callbackifyCopyFile = callbackify(initiation.copy.bind(initiation))
    let callbackifyTransform = callbackify(compiler.transform.bind(compiler))

    let beforeTasks = []
    let tasks = []
    let asyncTasks = []

    plugins.forEach((plugin) => {
      if (typeof plugin.beforeInitiate === 'function') {
        let callbackifyBeforeInitiate = callbackify(plugin.beforeInitiate.bind(plugin, optionManager, printer))
        beforeTasks.push(callbackifyBeforeInitiate)
      }

      if (typeof plugin.initiate === 'function') {
        let callbackifyInitiate = callbackify(plugin.initiate.bind(plugin, optionManager, printer))
        tasks.push(callbackifyInitiate)
      }

      if (typeof plugin.async === 'function') {
        let callbackifyAsync = callbackify(plugin.async.bind(plugin, optionManager, printer))
        asyncTasks.push(callbackifyAsync)
      }
    })

    tasks = tasks.concat([
      callbackifyInitiate.bind(null, compileOptions),
      callbackifyTransform.bind(null, compileOptions)
    ])

    parallel(asyncTasks, (error) => {
      if (error) {
        throw error
      }
    })

    series(beforeTasks, (error) => {
      if (error) {
        throw error
      }

      series(tasks, (error, stats) => {
        handleCallbackTransform(error, stats)
        isWatchFiles && handleWatchFiles()
      })
    })
  }

  caughtException (error) {
    let { printer } = this
    printer.push(colors.red.bold(error.message))
    error.stack && printer.push(error.stack)
    printer.flush()
  }

  printStats (stats, options, watching = false) {
    let { rootDir, srcDir } = options

    let statsFormatter = stats.map(({ assets, size }) => {
      assets = assets.replace(rootDir, '.')
      return { assets, size }
    })

    let warning = map(stats.conflict, (dependency, file) => {
      file = file.replace(rootDir, '')
      dependency = dependency.replace(rootDir, '')
      return `-> ${file} ${colors.gray('reqiured')} ${dependency}`
    })

    let printer = this.printer

    printer.push('')
    printer.push(`Wcapack Version at ${colors.cyan.bold(Package.version)}`)
    printer.push(`Time: ${colors.bold(colors.white(stats.spendTime))}ms\n`)
    printer.push(printer.formatStats(statsFormatter))
    printer.push('')

    printer.push(`✨ Open your ${colors.magenta.bold('WeChat Develop Tool')} to serve`)
    watching && printer.push(`✨ Watching folder ${colors.white.bold(srcDir)}, cancel at ${colors.white.bold('Ctrl + C')}`)
    printer.push('')

    if (warning.length > 0) {
      printer.push(colors.yellow.bold('Some below files required each other, it maybe occur circular reference error in WeChat Mini Application'))
      printer.push(warning.join('\n'))
      printer.push('')
    }

    printer.flush()
  }
}

program
  .command('development')
  .description('Build WeChat Mini App in development environment')
  .option('-c, --config', 'Set configuration file')
  .option('-w, --watch', 'Watch the file changed, auto compile')
  .action(function (options) {
    let compile = new CompileTask(options)
    compile.run()
  })
