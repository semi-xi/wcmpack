import http from 'http'
import colors from 'colors'
import localip from 'local-ip'
import Finalhandler from 'finalhandler'
import ServeStatic from 'serve-static'

export default class StaticServer {
  constructor (options) {
    let port = 3000
    this.options = Object.assign({ port }, options)
  }

  async (optionManager, printer) {
    let options = optionManager.connect(this.options)
    let { staticDir, pubPath, port } = options

    let serve = ServeStatic(staticDir)
    var server = http.createServer((request, response) => {
      serve(request, response, Finalhandler(request, response))
    })

    server.listen(port, '0.0.0.0')

    printer.layze(`Static server is running at ${colors.cyan.bold(`${localip()}:${port}`)}`)
    printer.layze(`Static output is served from ${colors.cyan.bold(pubPath)}`)
    printer.layze('')

    return Promise.resolve()
  }
}
