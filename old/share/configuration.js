import fs from 'fs-extra'
import path from 'path'

export const rootDir = process.cwd()
export const execDir = path.join(__dirname, '../../')

let rcSettings = {}
let rcFile = path.join(rootDir, '.wcarc.json')
if (fs.existsSync(rcFile)) {
  rcSettings = fs.readJSONSync(rcFile)
}

export const srcDir = path.join(rootDir, rcSettings.src || 'src')
export const distDir = path.join(rootDir, rcSettings.dist || 'dist')
export const nodeModuleName = 'npm'
