import program from 'commander'
import { version } from '../package.json'
import './commander/compile'

let params = process.argv
program.version(version).option('--quiet').parse(params)
