import program from 'commander'
import { version } from '../package.json'
import './commander/generator'
import './commander/compile'

program
  .version(version)
  .option('--quiet')

let params = process.argv
if (!params.slice(2).length) {
  program.outputHelp()
}

program.parse(params)
