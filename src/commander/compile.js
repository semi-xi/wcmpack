import { callbackify } from 'util'
import colors from 'colors'
import program from 'commander'
import map from 'lodash/map'
import { transform, watchTransform } from '../compiler'
import { trace, formatStats } from '../share/printer'
import { srcDir, distDir } from '../share/configuration'
import Package from '../../package.json'

const caughtException = function (error) {
  trace(colors.red.bold(error.message))
  error.stack && trace(error.stack)
}

const printStats = function (stats, watching = false) {
  let statsFormatter = stats.map(({ assets, size }) => {
    assets = assets.replace(distDir, '')
    return { assets, size }
  })

  let warning = map(stats.conflict, (dependency, file) => {
    file = file.replace(srcDir, '')
    dependency = dependency.replace(srcDir, '')
    return `-> ${file} ${colors.gray('reqiured')} ${dependency}`
  })

  trace('')
  trace(`Wcapack Version at ${colors.cyan.bold(Package.version)}`)
  trace(`Time: ${colors.bold(colors.white(stats.spendTime))}ms\n`)
  trace(formatStats(statsFormatter))
  trace('')
  trace(`✨ Open your ${colors.magenta.bold('WeChat Develop Tool')} to serve`)
  watching && trace(`✨ Watching folder ${colors.white.bold(srcDir)}, cancel at ${colors.white.bold('Ctrl + C')}`)
  trace('')

  if (warning.length > 0) {
    trace(colors.yellow.bold('Some below files required each other, it maybe occur circular reference error in WeChat Mini Application'))
    trace(warning.join('\n'))
    trace('')
  }
}

program
  .command('development')
  .description('Build WeChat Mini App in development environment')
  .option('-c, --config', 'Set configuration file')
  .option('-w, --watch', 'Watch the file changed, auto compile')
  .action(function (options) {
    let handleTransform = function (error, stats) {
      error ? caughtException(error) : printStats(stats, options.watch)
    }

    let callbackifyTransform = callbackify(transform)
    let configFile = options.config ? options.config : '../constants/development.config'
    let transformOptions = require(configFile)
    transformOptions = transformOptions.default || transformOptions

    callbackifyTransform(srcDir, transformOptions, handleTransform)
    options.watch && watchTransform(transformOptions, handleTransform)
  })

program
  .command('production')
  .description('Build WeChat Mini App in production environment')
  .option('-c, --config', 'Set configuration file')
  .action(function (options) {
    let configFile = options.config ? options.config : '../constants/production.config'
    let transformOptions = require(configFile)
    transformOptions = transformOptions.default || transformOptions

    transform(transformOptions, (error, stats) => error ? caughtException(error) : printStats(stats))
  })
