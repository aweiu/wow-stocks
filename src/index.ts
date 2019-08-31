import setPromiseInterval, { clearPromiseInterval } from 'set-promise-interval'
import {
  getHistory,
  getRealTimeAll,
  getRealTimeCodes,
  getTradeDates,
  updateAllCodes,
} from 'wow-stock-quotation'
import { Quotation, RealTimeQuotation } from 'wow-stock-quotation/dist/types'
import LocalStorage from './libs/local-storage'
import Progress from './libs/progress'
import { Histories, Option, UpdateType } from './types'
// tslint:disable-next-line:no-var-requires
const fecha = require('fecha')

type PromiseReturnType<T extends () => any> = ReturnType<T> extends Promise<
  infer R
>
  ? R
  : ReturnType<T>

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

async function incrementalUpdate(
  realTimeQuotation: RealTimeQuotation,
  length: number,
) {
  const historyCodes = Object.keys(histories)
  if (historyCodes.length === 0) return
  const previousTradeDate = await getPreviousTradeDate()
  for (const code of historyCodes) {
    const now = realTimeQuotation[code]
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
        progress.tick(code, UpdateType.Incremental)
      }
    }
  }
}

function fullUpdate(realTimeQuotation: RealTimeQuotation, length: number) {
  const codes = Object.keys(realTimeQuotation)
  const lastDate = realTimeQuotation[codes[0]].date
  const updateCodes: string[] = []
  for (const code of codes) {
    const history = histories[code]
    if (
      !history ||
      history._lastDate !== lastDate ||
      history._length !== length
    ) {
      updateCodes.push(code)
    }
  }
  if (updateCodes.length === 0) return Promise.resolve()
  return getHistory(updateCodes, (data, code) => {
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
    progress.tick(code, UpdateType.Full)
  })
}

export async function update({
  length,
  forceSkip,
  progressBar = true,
  callback,
  codes,
}: Option) {
  const getRealTimeQuotation = () =>
    codes ? getRealTimeCodes(codes) : getRealTimeAll()

  if (!forceSkip) {
    const updatedCodes = new Set()
    const save = () => {
      if (updatedCodes.size > 0) localStorage.setItem('histories', histories)
    }

    progress = new Progress(progressBar, (info) => {
      if (info.type !== UpdateType.Cache) updatedCodes.add(info.code)
      if (callback) callback(info)
    })
    if (!codes) await updateAllCodes()
    const realTimeQuotation = await getRealTimeQuotation()
    const updateCodes = Object.keys(realTimeQuotation)
    progress.setTotal(updateCodes.length)
    process.addListener('SIGINT', save)
    try {
      await incrementalUpdate(realTimeQuotation, length) // 先尝试增量更新
      await fullUpdate(realTimeQuotation, length) // 全量补充
      save()
      // 剩下的都是未更新的股票，统一做进度提示
      const cacheCodes = updateCodes.filter((code) => !updatedCodes.has(code))
      for (const code of cacheCodes) progress.tick(code, UpdateType.Cache)
    } catch (e) {
      save()
      throw e
    } finally {
      process.removeListener('SIGINT', save)
    }
  }
  // 可以基于行情搞事情了！
  const get = async () => {
    const data = []
    const realTimeQuotation = await getRealTimeQuotation()
    for (const code of Object.keys(realTimeQuotation)) {
      const now = realTimeQuotation[code]
      if (now.suspended) continue
      const history = histories[code]
      for (const field of FIELDS) {
        history[field][history[field].length - 1] = now[field]
      }
      data.push({ code, ...history })
    }
    return data
  }

  const watch = (callback: (data: PromiseReturnType<typeof get>) => any) => {
    const id = setPromiseInterval(async () => {
      try {
        callback(await get())
      } catch (e) {
        // 忽略
      }
    }, 1000)
    return () => clearPromiseInterval(id)
  }

  return { get, watch }
}
