import LocalStorage from './libs/local-storage'
import Progress from './libs/progress'
import {
  updateAllCodes,
  getAllNow,
  getHistory,
  getTradeDates,
} from './libs/quotation'
import { AllQuotation, Histories, Option, Quotation } from './types'
// tslint:disable-next-line:no-var-requires
const fecha = require('fecha')

let historyChanged = false
let progress!: Progress
const localStorage = new LocalStorage('./db.json')
const histories = localStorage.getItem<Histories>('histories') || {}
const FIELDS: Array<keyof Quotation & keyof Histories['']> = [
  'open',
  'high',
  'low',
  'close',
  'volume',
  'amount',
  'turnover',
]

function save() {
  if (historyChanged) localStorage.setItem('histories', histories)
}

async function getPreviousTradeDate() {
  const now = new Date()
  const startDate = fecha.format(
    now.getTime() - 1000 * 60 * 60 * 24 * 9, // 查询最近 10 天的交易日
    'YYYY-MM-DD',
  )
  const endDate = fecha.format(now, 'YYYY-MM-DD')
  const tradeDates = await getTradeDates(startDate, endDate)
  return tradeDates[tradeDates.length - 2]
}

async function incrementalUpdate(allNow: AllQuotation, length: number) {
  const historyCodes = Object.keys(histories)
  if (historyCodes.length === 0) return
  const previousTradeDate = await getPreviousTradeDate()
  for (const code of historyCodes) {
    const now = allNow[code]
    const history = histories[code]
    if (
      now &&
      history._length === length &&
      history._lastDate === previousTradeDate &&
      previousTradeDate !== now.date // 当天是交易日但是还没有开盘
    ) {
      history._lastDate = now.date
      // 非停牌的数据
      if (!now.suspended) {
        const slice = history.open.length === length
        for (const field of FIELDS) {
          const arr = history[field].concat(now[field])
          history[field] = slice ? arr.slice(1) : arr
        }
        historyChanged = true
        progress.tick(code, '增量更新')
      }
    }
  }
}

function fullUpdate(allNow: AllQuotation, length: number) {
  const allCodes = Object.keys(allNow)
  const lastDate = allNow[allCodes[0]].date
  const updateCodes: string[] = []
  for (const code of allCodes) {
    const history = histories[code]
    if (
      !history ||
      history._lastDate !== lastDate ||
      history._length !== length
    ) {
      updateCodes.push(code)
    } else {
      progress.tick(code, 'from cache')
    }
  }
  if (updateCodes.length === 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    getHistory(updateCodes, (e, data, code) => {
      if (e) return reject(e)
      // @ts-ignore
      const history: Histories[''] = { _length: length, _lastDate: lastDate }
      for (const field of FIELDS) history[field] = []
      const availableData = data.filter(({ suspended }) => !suspended)
      availableData.splice(0, availableData.length - length)
      for (const _history of availableData) {
        for (const field of FIELDS) {
          history[field].push(_history[field])
        }
      }
      histories[code] = history
      historyChanged = true
      progress.tick(code, '全量更新')
      if (progress.isCompleted) resolve()
    })
  })
}

async function update({ length, progressBar = true, callback }: Option) {
  progress = new Progress(progressBar, callback)
  await updateAllCodes()
  const allNow = await getAllNow()
  progress.setTotal(Object.keys(allNow).length)
  try {
    await incrementalUpdate(allNow, length) // 先尝试增量更新
    await fullUpdate(allNow, length) // 全量补充
    save()
  } catch (e) {
    progress.stop()
    console.error(e)
    save()
    console.log('发生错误了，数据已保存。请重试')
  }
}

update({
  length: 90,
})
