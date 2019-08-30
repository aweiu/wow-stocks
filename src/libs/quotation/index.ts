import { PythonShell } from 'python-shell'
import { RealTimeQuotation, Quotation, TradeStatus } from '../../types'

// 大盘代码
export const SZ = 'sz399001'
export const SH = 'sh000001'

function _execPython(fileName: string, ...args: string[]) {
  return new Promise<any>((resolve, reject) => {
    PythonShell.run(`${__dirname}/${fileName}.py`, { args }, (e, rs: any) => {
      if (e) {
        reject(e)
      } else {
        try {
          const data = Array.isArray(rs)
            ? rs.length === 1
              ? rs[0]
              : rs[1] // baostock 会首尾返回两条登录信息
            : rs
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      }
    })
  })
}

// @ts-ignore
async function retry<T>(fun: () => T): T {
  const maxRetryNum = 3
  for (let retryNum = 1; retryNum <= maxRetryNum; retryNum++) {
    try {
      return await fun()
    } catch (e) {
      if (retryNum === maxRetryNum) {
        throw e
      }
    }
  }
}

function execPython(fileName: string, ...args: string[]) {
  return retry(() => _execPython.apply(null, [fileName, ...args]))
}

function getRealTimeQuotation(data: any) {
  const quotations: RealTimeQuotation = {}
  const lastDate = data[SZ].datetime.split(' ')[0] // 取深圳成指日期为最新交易日期
  for (const code of Object.keys(data)) {
    const {
      datetime,
      open,
      high,
      low,
      now,
      volume,
      '成交额(万)': amount,
      turnover,
    } = data[code]
    // 排除「死股」
    if (datetime.split(' ')[0] === lastDate) {
      const availableCode = getAvailableCode(code)
      quotations[availableCode] = {
        date: lastDate,
        code: availableCode,
        open,
        high,
        low,
        close: now,
        volume,
        amount,
        turnover,
        suspended: volume === 0,
      }
    }
  }
  return quotations
}

export async function getRealTimeAll(): Promise<RealTimeQuotation> {
  const data: any = await execPython('real-time-all')
  return getRealTimeQuotation(data)
}

export function updateAllCodes() {
  return execPython('update-stock-codes')
}

function _getRealTimeCodes(codes: string[]): Promise<RealTimeQuotation> {
  const pythonShell = new PythonShell(`${__dirname}/real-time-codes.py`)
  return new Promise((resolve, reject) => {
    pythonShell
      .send(codes)
      .on('message', (data) => {
        try {
          const quotations: any[] = JSON.parse(data)
          resolve(getRealTimeQuotation(quotations))
        } catch (e) {
          reject(e)
        }
      })
      .on('error', reject)
      .end(() => null)
  })
}

function getAvailableCode(code: string) {
  return `${code.substr(0, 2)}.${code.substr(2)}`
}

export async function getRealTimeCodes(codes: string[]) {
  if (codes.length === 0) throw Error('empty codes')
  const availableCodes = codes.slice(0)
  if (!codes.includes(SZ)) availableCodes.push(SZ)
  const data = await retry(() => _getRealTimeCodes(availableCodes))
  if (!codes.includes(SZ)) delete data[getAvailableCode(SZ)]
  return data
}

export function getHistory(
  codes: string[],
  callback: (data: Quotation[], code: string) => any,
) {
  if (codes.length === 0) throw Error('empty codes')
  let index = -1
  let error = false
  const ignoreMessages = ['login success!', 'logout success!']
  const pythonShell = new PythonShell(`${__dirname}/history.py`, {
    pythonOptions: ['-u'],
  })
  return new Promise((resolve, reject) => {
    pythonShell
      .send(codes)
      .on('message', (data) => {
        if (error || ignoreMessages.includes(data)) return
        index++
        try {
          const quotations: any[] = JSON.parse(data)
          callback(
            quotations.map(
              ({
                date,
                code,
                open,
                high,
                low,
                close,
                volume,
                amount,
                turn,
                tradestatus,
              }) => ({
                date,
                code,
                open: Number(open),
                high: Number(high),
                low: Number(low),
                close: Number(close),
                volume: Number(volume),
                amount: Number(amount),
                turnover: turn,
                suspended: tradestatus === TradeStatus.Suspended,
              }),
            ),
            codes[index],
          )
          if (index >= codes.length - 1) resolve()
        } catch (e) {
          error = true
          pythonShell.terminate()
          reject(e)
        }
      })
      .on('error', (e) => {
        error = true
        reject(e)
      })
      .end(() => null)
  })
}

export async function getTradeDates(
  startDate: string,
  endDate: string,
): Promise<string[]> {
  const data: any[] = await execPython('query-trade-dates', startDate, endDate)
  return data
    .filter(({ is_trading_day }) => is_trading_day === '1')
    .map(({ calendar_date }) => calendar_date)
}
