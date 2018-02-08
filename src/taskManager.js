export default class TaskManager {
  constructor () {
    this.tasks = []
  }

  addTask (task) {
    if (task instanceof Promise) {
      this.tasks.push(task)
    }
  }

  execute () {
    return Promise.all(this.tasks)
  }
}
