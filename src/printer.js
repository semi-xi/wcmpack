import path from 'path'
import colors from 'colors'
import columnify from 'columnify'
import OptionManager from './optionManager'

export default class Printer {
  constructor (options) {
    this.options = options instanceof OptionManager ? options : new OptionManager(options)
    this.messages = []
    this.layzeMessages = []
  }

  push (message, type = 'append') {
    if (typeof message === 'string') {
      type === 'append'
        ? this.messages.push(message)
        : this.messages.unshift(message)
    }
  }

  layze (message, type = 'append') {
    if (typeof message === 'string') {
      type === 'append'
        ? this.layzeMessages.push(message)
        : this.layzeMessages.unshift(message)
    }
  }

  flush () {
    this.messages.forEach(this.trace.bind(this))
    this.layzeMessages.forEach(this.trace.bind(this))

    this.messages.splice(0)
    this.layzeMessages.splice(0)
  }

  /**
   * print stats
   * @param {Object} options setting
   */
  trace (message) {
    let { silence } = this.options
    silence !== true && console.log(message)
  }

  /**
   * format file size
   * @param {number} bytes size
   * @param {number} decimals decimal size
   */
  formatBytes (bytes, decimals) {
    // eslint-disable-next-line eqeqeq
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
  formatStats (stats) {
    return columnify(stats, {
      headingTransform (heading) {
        let name = heading.charAt(0).toUpperCase() + heading.slice(1)
        return colors.bold(colors.white(name))
      },
      config: {
        assets: {
          maxWidth: 80,
          align: 'right',
          dataTransform (file) {
            let dirname = path.dirname(file)
            let filename = path.basename(file)
            if (file.length > this.maxWidth) {
              let length = this.maxWidth - filename.length
              if (length > 0) {
                dirname = dirname.substr(0, length - 3) + '..'
              }
            }

            return colors.bold(colors.green(path.join(dirname, filename)))
          }
        },
        size: {
          align: 'right',
          dataTransform: (size) => {
            return this.formatBytes(size)
          }
        }
      }
    })
  }
}
