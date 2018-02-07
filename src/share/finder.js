import fs from 'fs-extra'
import path from 'path'

export const findForMatch = function (directory, rules) {
  let assets = {}
  if (!fs.statSync(directory).isDirectory()) {
    let matches = rules.filter(({ test: pattern }) => pattern.test(directory))
    if (matches.length > 0) {
      assets[directory] = matches
    }

    return assets
  }

  let files = fs.readdirSync(directory)
  files.forEach((filename) => {
    let file = path.join(directory, filename)
    if (fs.statSync(file).isDirectory()) {
      let subAssets = findForMatch(file, rules)
      assets = Object.assign(assets, subAssets)
      return
    }

    let matches = rules.filter(({ test: pattern }) => pattern.test(file))
    if (matches.length > 0) {
      assets[file] = matches
    }
  })

  return assets
}
