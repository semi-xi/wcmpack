import fs from 'fs-extra'
import path from 'path'
import glob from 'glob'
import colors from 'colors'
import program from 'commander'
import chokidar from 'chokidar'
import parallel from 'async/parallel'
import map from 'lodash/map'
import filter from 'lodash/filter'
import defaults from 'lodash/defaults'
import isFunction from 'lodash/isFunction'
import isEmpty from 'lodash/isEmpty'
import flattenDeep from 'lodash/flattenDeep'
import { transform as transformJS } from '../compiler/compileJS'
import { transform as transformCSS } from '../compiler/compileCSS'
import { copy as copyFile } from '../compiler/copyAssets'
import { trace, formatStats } from '../share/printer'
import { srcDir, distDir } from '../share/configuration'
import Package from '../../package.json'

const finder = function (pattern, options = {}, callback) {
  if (arguments.length < 3) {
    return finder(pattern, {}, options)
  }

  if (!isFunction(callback)) {
    throw new TypeError('Callback is not a function or not provided')
  }

  options = defaults({}, options, {
    cwd: srcDir,
    realpath: true,
    absolute: true
  })

  glob(pattern, options, (error, files) => {
    if (error) {
      callback(error)
      return
    }

    files = filter(files, (file) => path.basename(file).charAt(0) !== '_')
    callback(null, files)
  })
}

const compileJS = function (pattern, options = {}, callback, __existsFiles__ = [], __relationship__ = []) {
  if (!isFunction(callback)) {
    throw new TypeError('Callback is not a function or not provided')
  }

  finder(pattern || './**/*.js', function (error, files) {
    if (error) {
      callback(error)
      return
    }

    let compileTasks = map(files, (file) => (callback) => transformJS(file, options, callback, __existsFiles__, __relationship__))
    parallel(compileTasks, (error, stats) => {
      stats = flattenDeep(stats)
      stats = filter(stats, (state) => !isEmpty(state))

      let conflict = {}
      for (let i = __relationship__.length; i--;) {
        for (let j = __relationship__.length; j--;) {
          if (__relationship__[i].file === __relationship__[j].dependency && __relationship__[j].file === __relationship__[i].dependency) {
            conflict[__relationship__[i].file] = __relationship__[j].file
          }
        }
      }

      stats.conflict = conflict
      error ? callback(error) : callback(null, stats)
    })
  })
}

const compileCSS = function (pattern, options = {}, callback) {
  if (!isFunction(callback)) {
    throw new TypeError('Callback is not a function or not provided')
  }

  finder(pattern || './**/*.scss', function (error, files) {
    if (error) {
      callback(error)
      return
    }

    let compileTasks = map(files, (file) => transformCSS.bind(null, file, options))
    parallel(compileTasks, (error, stats) => {
      stats = flattenDeep(stats)
      stats = filter(stats, (state) => !isEmpty(state))
      error ? callback(error) : callback(null, stats)
    })
  })
}

const copyAssets = function (pattern, options = {}, callback) {
  if (!isFunction(callback)) {
    throw new TypeError('Callback is not a function or not provided')
  }

  finder(pattern || './**/*.{json,wxml}', function (error, files) {
    if (error) {
      callback(error)
      return
    }

    let copyTasks = map(files, (file) => (callback) => copyFile(file, options, callback))
    parallel(copyTasks, callback)
  })
}

const cleanup = function (callback) {
  fs.removeSync(distDir)
  trace(colors.white.bold(`Clean up ${distDir}`))
}

export const transform = function (options = {}, callback) {
  if (!isFunction(callback)) {
    throw new TypeError('Callback is not a function or not provided')
  }

  let startTime = Date.now()

  let jsOptions = options.js || {}
  let cssOptions = options.css || {}
  let assetsOptions = options.assets || {}

  cleanup()

  parallel([
    compileJS.bind(null, jsOptions.test, jsOptions),
    compileCSS.bind(null, cssOptions.test, cssOptions),
    copyAssets.bind(null, assetsOptions.test, assetsOptions)
  ],
  (error, stats) => {
    if (error) {
      callback(error)
      return
    }

    let [jsStats, cssStats, cpyStats] = stats
    stats = [].concat(jsStats, cssStats, cpyStats)
    stats.conflict = jsStats.conflict || {}
    stats.spendTime = Date.now() - startTime

    callback(null, stats)
  })
}

export const watchTransform = function (options = {}, callback) {
  if (!isFunction(callback)) {
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
  let statsFormatter = map(stats, ({ assets, size }) => {
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
