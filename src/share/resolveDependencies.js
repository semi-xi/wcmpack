import findIndex from 'lodash/findIndex'
import stripComments from 'strip-comments'
import { resolve as relativeResolve } from './requireRelative'

export const resolveDestination = function (file, options) {
  let { rootDir, srcDir, outDir } = options
  return new RegExp(srcDir).test(file) ? file.replace(srcDir, outDir) : file.replace(rootDir, outDir)
}

export const resolveDependencies = function (code, file, relativeTo, options) {
  code = stripComments(code)

  let dependencies = []

  while (true) {
    let match = /require\(['"]([\w\d_\-./]+)['"]\)/.exec(code)
    if (!match) {
      break
    }

    let [all, required] = match
    code = code.replace(all, '')

    let dependency = relativeResolve(required, relativeTo)
    if (findIndex(dependencies, { file, dependency, required }) === -1) {
      let destination = resolveDestination(dependency, options)
      dependencies.push({ file, dependency, destination, required })
    }
  }

  return dependencies
}
