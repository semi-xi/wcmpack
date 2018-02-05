import glob from 'glob'
import colors from 'colors'
import program from 'commander'
import chokidar from 'chokidar'
import waterfall from 'async/waterfall'
import parallel from 'async/parallel'
import map from 'lodash/map'
import isArray from 'lodash/isArray'
import flattenDeep from 'lodash/flattenDeep'
import { parse } from '../parser'
import { trace, formatStats } from '../share/printer'
import { srcDir, distDir, rootDir } from '../share/configuration'
import Package from '../../package.json'

export const transform = function (options = {}, callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('Callback is not a function or not provided')
  }

  let basePath = options.cwd || rootDir
  let patterns = map(options.rules, 'test')

  let finders = patterns.map((pattern) => (callback) => glob(pattern, {
    cwd: basePath,
    root: '/',
    realpath: true,
    absolute: true
  }, callback))

  let chunkTasks = []
  let addChunks = function (tasks) {
    tasks = isArray(tasks) ? tasks : [tasks]
    chunkTasks.push(...tasks)
  }

  let genParseFileTasks = function (files, options) {
    return files.map((file) => (callback) => parse.call({ addChunks }, file, options, callback))
  }

  let excParseFileTasks = function (files, options, callback) {
    let tasks = genParseFileTasks(files, options)
    parallel(tasks, callback)
  }

  let genParseChunkTasks = function (chunk) {
    return chunk.map((files, index) => (callback) => excParseFileTasks(files, options.rules[index], callback))
  }

  let excParseChunkTasks = function (chunk, callback) {
    let tasks = genParseChunkTasks(chunk, options)
    parallel(tasks, callback)
  }

  waterfall([parallel.bind(null, finders), excParseChunkTasks], function (error, stats) {
    if (error) {
      callback(error)
      return
    }

    parallel(chunkTasks, (error, otherStats) => {
      if (error) {
        callback(error)
        return
      }

      stats = stats.concat(otherStats)
      stats = stats.filter((stats) => stats)
      stats = flattenDeep(stats)
      callback(null, stats)
    })
  })
}

export const watchTransform = function (options = {}, callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('Callback is not a function or not provided')
  }

  let handleTransform = transform.bind(null, options, callback)

  let watcher = chokidar.watch(srcDir)
  watcher.on('change', handleTransform)
  watcher.on('unlink', handleTransform)

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

const caughtException = function (error) {
  trace(colors.red.bold(error.message))
  error.stack && trace(error.stack)
}

const printStats = function (stats, watching = false) {
  let statsFormatter = stats.map(({ assets, size }) => {
    assets = assets.replace(distDir, '')
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
    let handleTransform = function (error, stats) {
      error ? caughtException(error) : printStats(stats, options.watch)
    }

    let configFile = options.config ? options.config : '../constants/development.config'
    let transformOptions = require(configFile)
    transformOptions = transformOptions.default || transformOptions

    transform(transformOptions, handleTransform)
    options.watch && watchTransform(transformOptions, handleTransform)
  })

program
  .command('production')
  .description('Build WeChat Mini App in production environment')
  .option('-c, --config', 'Set configuration file')
  .action(function (options) {
    let configFile = options.config ? options.config : '../constants/production.config'
    let transformOptions = require(configFile)
    transformOptions = transformOptions.default || transformOptions

    transform(transformOptions, (error, stats) => error ? caughtException(error) : printStats(stats))
  })

// transform({

// }, function () {

// })
