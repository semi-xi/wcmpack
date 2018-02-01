import isFunction from 'lodash/isFunction'

export default function define (code, options = {}, callback) {
  if (!isFunction(callback)) {
    throw new TypeError('Callback is not a function or not be provided')
  }

  let result = void 0

  try {
    result = code.replace(/process\.env\.NODE_ENV/g, JSON.stringify(true))
  } catch (error) {
    callback(error)
    return
  }

  callback(null, result)
}
