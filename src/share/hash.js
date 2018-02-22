import fs from 'fs-extra'
import crypto from 'crypto'

export const gen = function (source, secret = 'wcmpack') {
  return crypto
    .createHash('sha256')
    .update(source)
    .digest('hex')
}

export const genFileSync = function (file) {
  let source = fs.readFileSync(file)
  return gen(source)
}

export const genFile = function (file, callback) {
  let hash = crypto.createHash('md5')
  let stream = fs.createReadStream(file)

  stream.on('data', (data) => hash.update(data, 'utf8'))
  stream.on('end', () => callback(null, hash.digest('hex')))
}
