import colors from 'colors'
import program from 'commander'
import chokidar from 'chokidar'
import map from 'lodash/map'
import flatten from 'lodash/flatten'
import capitalize from 'lodash/capitalize'
import parallel from 'async/parallel'
import series from 'async/series'
import asyncify from 'async/asyncify'
import OptionManager from '../optionManager'
import Assets from '../assets'
import Initiation from '../initiation'
import Compiler from '../compiler'
import Printer from '../printer'
import Package from '../../package.json'

export class CompileTask {
  constructor (options = {}) {
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
    this.running = false

    if (!/https?:\/\//.test(this.compileOptions.pubPath)) {
      throw new TypeError(`Config publicPath is ${this.compileOptions.pubPath}, it can not be visited in WeChat Mini Program`)
    }
  }

  run (options = this.options) {
    let startTime = Date.now()
    this.running = true

    let { watch: isWatchFiles } = options
    let { optionManager, assets, printer, compiler, initiation, compileOptions } = this
    let { rootDir, srcDir, plugins } = compileOptions

    let handleWriteFiles = (chunks) => {
      return chunks.map((chunk) => chunk.save())
    }

    let handleCallbackTransform = (error, chunks) => {
      if (error) {
        this.caughtException(error)
        this.running = false
        return
      }

      chunks = flatten(chunks).filter((chunks) => chunks)

      Promise
        .all(handleWriteFiles(chunks))
        .then((stats) => {
          stats.spendTime = Date.now() - startTime
          this.printStats(stats, compileOptions, isWatchFiles)

          this.running = false
        })
        .catch((error) => {
          this.caughtException(error)
          this.running = false
        })
    }

    let handleWatchFiles = () => {
      let handleFileChange = (path) => {
        if (this.running === true) {
          return
        }

        startTime = Date.now()
        this.running = true

        if (/\.(json)$/.test(path)) {
          printer.trace(`Assets file ${colors.bold(path.replace(rootDir, ''))} has been changed, copying...`)

          initiation
            .copy([path], compileOptions)
            .then(handleCallbackTransform.bind(null, null))
            .catch(handleCallbackTransform)

          return
        }

        printer.trace(`Source file ${colors.bold(path.replace(rootDir, ''))} has been changed, compiling...`)

        assets.reset()
        handleTransform()
      }

      let handleFileUnlink = (path) => {
        if (this.running === true) {
          return
        }

        if (/\.(json|wxml)$/.test(path)) {
          printer.trace(`Assets file ${colors.bold(path.replace(rootDir, ''))} has been deleted, ignore it`)
          return
        }

        this.running = true

        printer.trace(`Source file ${path} has been changed, compiling...`)

        assets.reset()
        handleTransform()
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

    let asyncifyInitiate = asyncify(initiation.initiate.bind(initiation))
    let asyncifyTransform = asyncify(compiler.transform.bind(compiler))

    let beforeTasks = []
    let tasks = []
    let asyncTasks = []

    plugins.forEach((plugin) => {
      if (typeof plugin.beforeInitiate === 'function') {
        let fn = plugin.beforeInitiate.bind(plugin, assets, optionManager, printer)
        beforeTasks.push(asyncify(fn))
      }

      if (typeof plugin.initiate === 'function') {
        let fn = plugin.initiate.bind(plugin, assets, optionManager, printer)
        tasks.push(asyncify(fn))
      }

      if (typeof plugin.async === 'function') {
        let fn = plugin.async.bind(plugin, assets, optionManager, printer)
        asyncTasks.push(asyncify(fn))
      }
    })

    tasks = tasks.concat([
      asyncifyInitiate.bind(null, compileOptions),
      asyncifyTransform.bind(null, compileOptions)
    ])

    parallel(asyncTasks, (error) => {
      if (error) {
        this.caughtException(error)
      }

      printer.push('Async tasks have beend completed.')
    })

    isWatchFiles && handleWatchFiles()

    let handleTransform = () => {
      series(tasks, handleCallbackTransform)
    }

    series(beforeTasks, (error) => {
      if (error) {
        this.caughtException(error)
        this.running = false
      } else {
        handleTransform()
      }
    })
  }

  caughtException (error) {
    let { printer } = this
    error.title && printer.push(colors.red.bold(error.title))
    error.stack && printer.push(colors.red.bold(error.stack))
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
    printer.push(`${capitalize(Package.name)} Version at ${colors.cyan.bold(Package.version)}`)
    printer.push(`Time: ${colors.bold(colors.white(stats.spendTime))}ms\n`)
    printer.push(printer.formatStats(statsFormatter))
    printer.push('')

    printer.push(`✨ Open your ${colors.magenta.bold('WeChat Develop Tool')} to serve`)
    watching && printer.push(`✨ Watching folder ${colors.white.bold(srcDir)}, cancel at ${colors.white.bold('Ctrl + C')}`)
    printer.push('')

    if (warning.length > 0) {
      printer.push(colors.yellow.bold('Some below files required each other, it maybe occur circular reference error in WeChat Mini Program'))
      printer.push(warning.join('\n'))
      printer.push('')
    }

    printer.flush()
  }
}

program
  .command('development')
  .description('Build WeChat Mini Program in development environment')
  .option('-c, --config', 'Set configuration file')
  .option('-w, --watch', 'Watch the file changed, auto compile')
  .action(function (options) {
    let compile = new CompileTask(options)
    compile.run()
  })

program
  .command('production')
  .description('Build WeChat Mini Program in production environment')
  .option('-c, --config', 'Set configuration file')
  .action(function (options) {
    options.config = options.config || '../constants/production.config'

    let compile = new CompileTask(options)
    compile.run()
  })
