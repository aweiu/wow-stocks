import { PythonShell } from 'python-shell'
import { AllQuotation, Quotation, TradeStatus } from '../../types'

function _execPython(fileName: string, ...args: string[]) {
  return new Promise<any>((resolve, reject) => {
    PythonShell.run(
      `${__dirname}/${fileName}.py`,
      { args, pythonPath: '/Users/yuawei/.pyenv/versions/3.7.2/bin/python' },
      (e, rs: any) => {
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
      },
    )
  })
}

async function execPython(fileName: string, ...args: string[]) {
  const maxRetryNum = 3
  for (let retryNum = 1; retryNum <= maxRetryNum; retryNum++) {
    try {
      return await _execPython.apply(null, [fileName, ...args])
    } catch (e) {
      if (retryNum === maxRetryNum) {
        throw e
      }
    }
  }
}

export async function getAllNow(): Promise<AllQuotation> {
  const quotations: AllQuotation = {}
  // TODO date 获取最新交易日
  const data: any = await execPython('now')
  const lastDate = data.sz399001.datetime.split(' ')[0] // 取深圳成指日期为最新交易日期
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
      const availableCode = `${code.substr(0, 2)}.${code.substr(2)}`
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

export function getHistory(
  codes: string[],
  callback: (e: Error | null, data: Quotation[], code: string) => any,
) {
  if (codes.length === 0) throw Error('empty codes')
  let index = -1
  let error = false
  const ignoreMessages = ['login success!', 'logout success!']
  const pythonShell = new PythonShell(`${__dirname}/history.py`, {
    pythonPath: '/Users/yuawei/.pyenv/versions/3.7.2/bin/python',
    pythonOptions: ['-u'],
  })
  pythonShell
    .send(codes)
    .on('message', (data) => {
      if (error || ignoreMessages.includes(data)) return
      index++
      try {
        const quotations: any[] = JSON.parse(data)
        callback(
          null,
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
      } catch (e) {
        error = true
        pythonShell.terminate()
        // @ts-ignore
        callback(e, null, null)
      }
    })
    // @ts-ignore
    .on('error', (e) => callback(e, null, null))
    .end(() => null)
}

export function updateAllCodes() {
  return execPython('update-stock-codes')
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
