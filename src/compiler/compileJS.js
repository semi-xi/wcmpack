import fs from 'fs-extra'
import path from 'path'
import map from 'lodash/map'
import filter from 'lodash/filter'
import indexOf from 'lodash/indexOf'
import isFunction from 'lodash/isFunction'
import parallel from 'async/parallel'
import waterfall from 'async/waterfall'
import { resolve as relativeResolve } from '../share/requireRelative'
import { resolveDependencies } from '../share/resolveDependencies'
import { rootDir, srcDir, distDir, nodeModuleName } from '../share/configuration'

const usePlugins = function (source, plugins, callback) {
  if (!isFunction(callback)) {
    throw new TypeError('Callback is not a function or not be provided')
  }

  let tasks = map(plugins, (plugin) => (source, callback) => {
    let transform = require(plugin.use)
    transform = transform.default || transform
    transform(source, plugin.options || {}, callback)
  })

  tasks.unshift((callback) => callback(null, source))
  waterfall(tasks, callback)
}

export const transform = function (file, options = {}, callback, __existsFiles__ = [], __relationship__ = []) {
  if (arguments.length < 3) {
    return transform(file, {}, options)
  }

  if (!isFunction(callback)) {
    throw new TypeError('Callback is not a function or not provided')
  }

  file = relativeResolve(file, rootDir)
  if (!fs.existsSync(file)) {
    throw new Error(`File ${file} is not exists`)
  }

  if (indexOf(__existsFiles__, file) !== -1) {
    callback(null)
    return
  }

  __existsFiles__.push(file)

  fs.readFile(file, function (error, source) {
    if (error) {
      callback(error)
      return
    }

    source = source.toString('')

    let plugins = options.plugins || []
    let transformPlugins = filter(plugins, (plugin) => !plugin.enforce)
    usePlugins(source, transformPlugins, (error, source) => {
      if (error) {
        callback(error)
        return
      }

      let relativeTo = path.dirname(file)
      let dependencies = resolveDependencies(source, file, relativeTo)
      __relationship__.push(...dependencies)

      let writeTasks = map(dependencies, ({ dependency }) => (callback) => transform(dependency, options, callback, __existsFiles__))

      let relativePath = file.search(srcDir) !== -1
        ? path.dirname(file).replace(srcDir, '')
        : /[\\/]node_modules[\\/]/.test(file)
          ? path.dirname(file).replace(path.join(rootDir, 'node_modules'), nodeModuleName)
          : path.dirname(file).replace(rootDir, '')

      let destination = path.join(distDir, relativePath, path.basename(file))
      let directory = path.dirname(destination)

      filter(dependencies, ({ destination: file, required }) => {
        let relativePath = path.relative(directory, file)
        if (relativePath.charAt(0) !== '.') {
          relativePath = `./${relativePath}`
        }

        relativePath = relativePath.replace('node_modules', nodeModuleName)
        source = source.replace(new RegExp(`require\\(['"]${required}['"]\\)`, 'gm'), `require('${relativePath.replace(/\.\w+$/, '')}')`)
      })

      writeTasks.push((callback) => {
        let transformPlugins = filter(plugins, (plugin) => plugin.enforce === 'after')
        usePlugins(source, transformPlugins, (error, source) => {
          if (error) {
            callback(error)
            return
          }

          fs.ensureDirSync(directory)
          fs.writeFile(destination, source, (error) => {
            if (error) {
              callback(error)
              return
            }

            let result = {
              assets: destination,
              size: source.length
            }

            callback(null, result)
          })
        })
      })

      parallel(writeTasks, callback)
    })
  })
}
