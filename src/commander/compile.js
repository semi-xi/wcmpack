import { callbackify } from 'util'
import colors from 'colors'
import program from 'commander'
import chokidar from 'chokidar'
import map from 'lodash/map'
import flatten from 'lodash/flatten'
import parallel from 'async/parallel'
import { Compiler } from '../compiler'
import initiate, { copyAssets } from '../build'
import { trace, formatStats } from '../share/printer'
import { rootDir, srcDir, distDir } from '../share/configuration'
import Package from '../../package.json'

const caughtException = function (error) {
  trace(colors.red.bold(error.message))
  error.stack && trace(error.stack)
}

const printStats = function (stats, watching = false) {
  let statsFormatter = stats.map(({ assets, size }) => {
    assets = assets.replace(distDir, '.')
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
    let handleCallbackTransform = function (error, stats) {
      stats = flatten(stats)
      stats.spendTime = Date.now() - startTime
      error ? caughtException(error) : printStats(stats, options.watch)
    }

    let compiler = new Compiler()
    let callbackifyInitiate = callbackify(initiate)
    let callbackifyCopyAssets = callbackify(copyAssets)
    let callbackifyTransform = callbackify(compiler.transform.bind(compiler))
    let configFile = options.config ? options.config : '../constants/development.config'
    let transformOptions = require(configFile)

    transformOptions = transformOptions.default || transformOptions
    transformOptions = Object.assign({ root: rootDir, src: srcDir, dist: distDir }, transformOptions)

    let tasks = [
      callbackifyInitiate.bind(null, srcDir, transformOptions),
      callbackifyTransform.bind(null, srcDir, transformOptions)
    ]

    parallel(tasks, function (error, stats) {
      handleCallbackTransform(error, stats)

      if (options.watch) {
        let handleFileChange = (path) => {
          startTime = Date.now()

          if (/\.(json|wxml)$/.test(path)) {
            trace(`Assets file ${colors.bold(path.replace(rootDir, ''))} has been changed, copying...`)
            callbackifyCopyAssets([path], transformOptions, handleCallbackTransform)
            return
          }

          trace(`Source file ${colors.bold(path.replace(rootDir, ''))} has been changed, compiling...`)
          callbackifyTransform(srcDir, transformOptions, handleCallbackTransform)
        }

        let handleFileUnlink = (path) => {
          if (/\.(json|wxml)$/.test(path)) {
            return
          }

          trace(`Source file ${path} has been changed, compiling...`)
          callbackifyTransform(srcDir, transformOptions, handleCallbackTransform)
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

program
  .command('production')
  .description('Build WeChat Mini App in production environment')
  .option('-c, --config', 'Set configuration file')
  .action(function (options) {
    let compiler = new Compiler()
    let configFile = options.config ? options.config : '../constants/production.config'
    let transformOptions = require(configFile)
    transformOptions = transformOptions.default || transformOptions

    compiler.transform(transformOptions, (error, stats) => error ? caughtException(error) : printStats(stats))
  })
