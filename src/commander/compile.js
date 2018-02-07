import { callbackify } from 'util'
import colors from 'colors'
import program from 'commander'
import chokidar from 'chokidar'
import map from 'lodash/map'
import flatten from 'lodash/flatten'
import parallel from 'async/parallel'
import OptionManager from '../optionManager'
import Assets from '../assets'
import Initiation from '../initiation'
import Compiler from '../compiler'
import { trace, formatStats } from '../share/printer'
import Package from '../../package.json'

let caughtException = function (error) {
  trace(colors.red.bold(error.message))
  error.stack && trace(error.stack)
}

let printStats = function (stats, options, watching = false) {
  let { srcDir, outDir } = options

  let statsFormatter = stats.map(({ assets, size }) => {
    assets = assets.replace(outDir, '.')
    return { assets, size }
  })

  let warning = map(stats.conflict, (dependency, file) => {
    file = file.replace(srcDir, '')
    dependency = dependency.replace(srcDir, '')
    return `-> ${file} ${colors.gray('reqiured')} ${dependency}`
  })

  trace('')
  trace(`Wcapack Version at ${colors.cyan.bold(Package.version)}`)
  trace(`Time: ${colors.bold(colors.white(stats.spendTime))}ms\n`)
  trace(formatStats(statsFormatter))
  trace('')
  trace(`✨ Open your ${colors.magenta.bold('WeChat Develop Tool')} to serve`)
  watching && trace(`✨ Watching folder ${colors.white.bold(srcDir)}, cancel at ${colors.white.bold('Ctrl + C')}`)
  trace('')

  if (warning.length > 0) {
    trace(colors.yellow.bold('Some below files required each other, it maybe occur circular reference error in WeChat Mini Application'))
    trace(warning.join('\n'))
    trace('')
  }
}

program
  .command('development')
  .description('Build WeChat Mini App in development environment')
  .option('-c, --config', 'Set configuration file')
  .option('-w, --watch', 'Watch the file changed, auto compile')
  .action(function (options) {
    let startTime = Date.now()

    let configFile = options.config ? options.config : '../constants/development.config'
    let compileOptions = require(configFile)
    compileOptions = compileOptions.default || compileOptions

    let optionManager = new OptionManager(compileOptions)
    let assets = new Assets(optionManager)
    let compiler = new Compiler(assets, optionManager)
    let initiation = new Initiation(assets, optionManager)

    compileOptions = optionManager.connect(compileOptions)
    let { rootDir, srcDir } = compileOptions

    let handleCallbackTransform = function (error, stats) {
      stats = flatten(stats)
      stats.spendTime = Date.now() - startTime
      error ? caughtException(error) : printStats(stats, compileOptions, options.watch)
    }

    let callbackifyInitiate = callbackify(initiation.initiate.bind(initiation))
    let callbackifyCopyFile = callbackify(initiation.copy.bind(initiation))
    let callbackifyTransform = callbackify(compiler.transform.bind(compiler))

    let tasks = [
      callbackifyInitiate.bind(null, compileOptions),
      callbackifyTransform.bind(null, compileOptions)
    ]

    parallel(tasks, function (error, stats) {
      handleCallbackTransform(error, stats)

      if (options.watch) {
        let handleFileChange = (path) => {
          startTime = Date.now()

          if (/\.(json|wxml)$/.test(path)) {
            trace(`Assets file ${colors.bold(path.replace(rootDir, ''))} has been changed, copying...`)
            callbackifyCopyFile([path], compileOptions, handleCallbackTransform)
            return
          }

          trace(`Source file ${colors.bold(path.replace(rootDir, ''))} has been changed, compiling...`)
          callbackifyTransform(compileOptions, handleCallbackTransform)
        }

        let handleFileUnlink = (path) => {
          if (/\.(json|wxml)$/.test(path)) {
            return
          }

          trace(`Source file ${path} has been changed, compiling...`)
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
    })
  })
