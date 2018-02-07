// import path from 'path'
// import { Transform } from 'stream'
// import { parse } from '../parser'
// import { resolveDependencies } from '../share/resolveDependencies'
// import { rootDir, srcDir, distDir, nodeModuleName } from '../share/configuration'

// export default class ReuqireTransform extends Transform {
//   constructor (options) {
//     super()

//     this._file = options.file
//     this._source = ''
//   }

//   _transform (buffer, encodeType, callback) {
//     this._source += buffer
//     callback()
//   }

//   _flush (callback) {
//     let { _file: file, _source: source } = this
//     let relativeTo = path.dirname(file)
//     let relativePath = file.search(srcDir) !== -1
//       ? path.dirname(file).replace(srcDir, '')
//       : /[\\/]node_modules[\\/]/.test(file)
//         ? path.dirname(file).replace(path.join(rootDir, 'node_modules'), nodeModuleName)
//         : path.dirname(file).replace(rootDir, '')

//     let destination = path.join(distDir, relativePath, path.basename(file))
//     let directory = path.dirname(destination)
//     let dependencies = resolveDependencies(source, file, relativeTo)

//     dependencies.forEach(({ dependency, destination: file, required }) => {
//       let relativePath = path.relative(directory, file)
//       if (relativePath.charAt(0) !== '.') {
//         relativePath = `./${relativePath}`
//       }

//       relativePath = relativePath.replace('node_modules', nodeModuleName)
//       source = source.replace(new RegExp(`require\\(['"]${required}['"]\\)`, 'gm'), `require('${relativePath.replace(/\.\w+$/, '')}')`)
//     })

//     callback()
//   }
// }

// export const transform = function (stream) {
//   stream.pipe()
// }

// export const genTask = function () {

// }

// export default function linkage (assets, options = {}, __existsFiles__ = []) {
//   let { file, source, rule, config } = assets
//   source = source.toString()

//     // assets.source = source
//     // tasks.push(parse(dependency, rule, config, __existsFiles__))
//   return source
//   // return Promise.all(tasks)
// }
