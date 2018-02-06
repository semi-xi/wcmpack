import chokidar from 'chokidar'
import { callbackify } from 'util'
import forEach from 'lodash/forEach'
import flattenDeep from 'lodash/flattenDeep'
import { parse } from './parser'
import { findForMatch } from './share/finder'
import { srcDir } from './share/configuration'

export const transform = function (directory, options = {}) {
  let startTime = Date.now()
  let files = findForMatch(directory, options.rules)
  let tasks = []
  forEach(files, (rule, file) => tasks.push(parse(file, rule[0], options)))
  return Promise.all(tasks).then((result) => {
    let stats = flattenDeep(result).filter((result) => result)
    stats.spendTime = Date.now() - startTime
    return stats
  })
}

export const watchTransform = function (options = {}, callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('Callback is not a function or not provided')
  }

  let handleTransform = callbackify(transform.bind(null, options))

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
