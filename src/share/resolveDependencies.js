import findIndex from 'lodash/findIndex'
import stripComments from 'strip-comments'
import { resolve as relativeResolve } from './requireRelative'
import { rootDir, srcDir, distDir } from './configuration'

export const resolveDestination = function (file) {
  return new RegExp(srcDir).test(file) ? file.replace(srcDir, distDir) : file.replace(rootDir, distDir)
}

export const resolveDependencies = function (code, file, relativeTo) {
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
      let destination = resolveDestination(dependency)
      dependencies.push({ file, dependency, destination, required })
    }
  }

  return dependencies
}
