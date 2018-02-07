import fs from 'fs-extra'
import path from 'path'
import { find } from './share/finder'
import { rootDir, srcDir, distDir } from './share/configuration'

export default function init (directory, options = {}) {
  options = Object.assign({ root: rootDir, src: srcDir, dist: distDir }, options)

  let files = find(directory, /\.(json|wxml)$/)
  let tasks = files.map((file) => new Promise((resolve) => {
    let relativePath = path.dirname(file).replace(options.src, '')
    let filename = path.basename(file)
    let destination = path.join(options.dist, relativePath, filename)
    let directory = path.dirname(destination)

    fs.ensureDirSync(directory)

    let readStream = fs.createReadStream(file)
    let writeStream = fs.createWriteStream(destination)

    let size = 0
    readStream.on('data', (buffer) => {
      size += buffer.length
    })

    readStream.on('end', () => {
      let stats = {
        assets: destination,
        size: size
      }

      resolve(stats)
    })

    readStream.pipe(writeStream)
  }))

  return Promise.all(tasks)
}

export const copyAssets = function (files, options) {
  options = Object.assign({ root: rootDir, src: srcDir, dist: distDir }, options)

  let tasks = files.map((file) => new Promise((resolve, reject) => {
    let relativePath = path.dirname(file).replace(options.src, '')
    let filename = path.basename(file)
    let destination = path.join(options.dist, relativePath, filename)
    let directory = path.dirname(destination)
    fs.ensureDirSync(directory)

    let readStream = fs.createReadStream(file)
    let writeStream = fs.createWriteStream(destination)

    let size = 0
    readStream.on('data', (buffer) => {
      size += buffer.length
    })

    readStream.on('end', () => {
      let stats = {
        assets: destination,
        size: size
      }

      resolve(stats)
    })

    readStream.pipe(writeStream)
  }))

  return Promise.all(tasks)
}
