import * as cliProgress from 'cli-progress'
import { Option } from '../types'

export default class Progress {
  private total = 0
  private value = 0
  private progress?: cliProgress.Bar
  private callback?: Option['callback']

  constructor(print: boolean, callback?: Option['callback']) {
    if (print) {
      this.progress = new cliProgress.Bar({
        format: '{prefix} [{bar}] {percentage}% {eta} 秒 {suffix}',
        barCompleteChar: '=',
        barIncompleteChar: '-',
        stopOnComplete: true,
      })
      this.progress.start(100, 0, { prefix: '数据准备中', suffix: '' })
    }
    this.callback = callback
  }

  get isCompleted() {
    return this.value >= this.total
  }

  tick(code: string, type: string) {
    this.value++
    if (this.progress) {
      this.progress.increment(1, {
        prefix:
          // @ts-ignore
          this.isCompleted ? '更新完毕' : '数据更新中',
        suffix: `${code}(${type})`,
      })
    }
    if (this.callback) {
      this.callback({
        value: this.value,
        total: this.total,
        code,
      })
    }
  }

  setTotal(total: number) {
    if (this.progress) this.progress.setTotal(total)
    this.total = total
  }

  stop() {
    if (this.progress) this.progress.stop()
  }
}
