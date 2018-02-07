import colors from 'colors'
import columnify from 'columnify'
import indexOf from 'lodash/indexOf'

const ingoreTrace = indexOf(process.argv, '--quiet') === -1

/**
 * print stats
 * @param {Object} options setting
 */
export function trace (message) {
  ingoreTrace && console.log(message)
}

/**
 * format file size
 * @param {number} bytes size
 * @param {number} decimals decimal size
 */
export const formatBytes = function (bytes, decimals) {
  /* eslint eqeqeq: off */
  if (bytes == 0) {
    return '0 Bytes'
  }

  let k = 1024
  let dm = decimals + 1 || 3
  let sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  let i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * format stats
 * @param {array} stats 状态
 */
export const formatStats = function (stats) {
  return columnify(stats, {
    headingTransform (heading) {
      let name = heading.charAt(0).toUpperCase() + heading.slice(1)
      return colors.bold(colors.white(name))
    },
    config: {
      assets: {
        maxWidth: 40,
        align: 'right',
        dataTransform (file) {
          return colors.bold(colors.green(file))
        }
      },
      size: {
        align: 'right',
        dataTransform (size) {
          return formatBytes(size)
        }
      }
    }
  })
}
