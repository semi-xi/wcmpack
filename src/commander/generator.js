import fs from 'fs-extra'
import path from 'path'
import colors from 'colors'
import program from 'commander'
import capitalize from 'lodash/capitalize'
import OptionManager from '../optionManager'
import Printer from '../printer'
import { find } from '../share/finder'
import Package from '../../package.json'

class GeneratorTask {
  constructor (options = {}) {
    let configFile = options.config ? options.config : '../constants/development.config'
    let compileOptions = require(configFile)
    compileOptions = compileOptions.default || compileOptions

    this.options = options
    this.optionManager = new OptionManager(compileOptions)
    this.printer = new Printer(this.optionManager)
    this.compileOptions = this.optionManager.connect(compileOptions)

    let { execDir } = this.compileOptions
    this.name = options.name || ''
    this.template = options.template || path.join(execDir, './sources/templates/default')

    if (this.name.length === 0) {
      throw new Error('Name is not provided')
    }
  }

  run (options = this.options) {
    let startTime = Date.now()
    let { compileOptions } = this
    let { rootDir } = compileOptions
    let directory = path.join(rootDir, this.name)
    let tasks = []

    if (fs.existsSync(directory) && fs.readdirSync(directory).length > 0) {
      console.log(colors.red(`${directory} is not empty, please ensure folder is empty`))
      return
    }

    if (/^(https?:\/\/|git@)/.test(this.template)) {
      console.log(colors.red('Not support remote template from now...'))
    } else if (fs.existsSync(this.template)) {
      let files = find(this.template, /.*/)
      let srcDir = this.template

      tasks = files.map(function (file) {
        let relativePath = file.replace(srcDir, '')
        let destination = path.join(directory, relativePath)

        return new Promise(function (resolve, reject) {
          fs.ensureFileSync(destination)

          let readStream = fs.createReadStream(file)
          let writeStream = fs.createWriteStream(destination)

          let size = 0
          readStream.on('data', (buffer) => {
            size += buffer.byteLength
          })

          readStream.on('error', (error) => {
            reject(error)
            readStream.end()
          })

          writeStream.on('finish', () => {
            let stats = {
              assets: destination,
              size: size
            }

            resolve(stats)
          })

          writeStream.on('error', (error) => {
            reject(error)
            writeStream.end()
          })

          readStream.pipe(writeStream)
        })
      })
    }

    Promise
      .all(tasks)
      .then((stats) => {
        stats.spendTime = Date.now() - startTime
        this.printStats(stats, compileOptions)
      })
      .catch(this.caughtException.bind(this))
  }

  caughtException (error) {
    let { printer } = this
    printer.push(colors.red.bold(error.message))
    error.stack && printer.push(error.stack)
    printer.flush()
  }

  printStats (stats) {
    let { printer, compileOptions } = this
    let { rootDir } = compileOptions

    let statsFormatter = stats.map(({ assets, size }) => {
      assets = assets.replace(rootDir, '.')
      return { assets, size }
    })

    printer.push('')
    printer.push(`${capitalize(Package.name)} Version at ${colors.cyan.bold(Package.version)}`)
    printer.push(`Time: ${colors.bold(colors.white(stats.spendTime))}ms\n`)
    printer.push(printer.formatStats(statsFormatter))
    printer.push('')
    printer.push(`✨ Initialization of project ${colors.white.bold(this.name)} has been completed.`)
    printer.push(`✨ Open ${colors.white.bold(path.join(rootDir, this.name))} in Terminal, and then run ${colors.white.bold('`npm install`')}.`)
    printer.push(`✨ Try to run ${colors.white.bold('`npm start`')} to compile project.`)
    printer.push(`✨ Open the ${colors.magenta('WeChat Develop Tool')} and choose the ${colors.white.bold(path.join(rootDir, this.name, 'app'))} folder.`)
    printer.push('')

    printer.flush()
  }
}

program
  .command('init [name]')
  .description('Initialize WeChat Mini Program Project')
  .option('-c, --config', 'Set configuration file')
  .option('-t, --template', 'Set project template')
  .action(function (name, options) {
    if (!name) {
      console.log(colors.red('Please entry the name of the project'))
      return
    }

    options.name = name
    let gen = new GeneratorTask(options)
    gen.run()
  })
