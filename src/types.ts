export enum TradeStatus {
  Suspended = '0',
  Normal = '1',
}

export enum UpdateType {
  Cache,
  Incremental,
  Full,
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

export interface RealTimeQuotation {
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
  codes?: string[]
  callback?: (info: {
    value: number
    total: number
    code: string
    type: UpdateType
  }) => any
}
