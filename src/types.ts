export enum TradeStatus {
  Suspended = '0',
  Normal = '1',
}

export interface Quotation {
  date: string
  code: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  amount: number
  turnover: number
  suspended: boolean
}

export interface AllQuotation {
  [code: string]: Quotation
}

export interface Histories {
  [code: string]: {
    _lastDate: string
    _length: number
    open: number[]
    high: number[]
    low: number[]
    close: number[]
    volume: number[]
    amount: number[]
    turnover: number[]
  }
}

export interface Option {
  length: number
  progressBar?: boolean
  callback?: (info: { value: number; total: number; code: string }) => any
}
