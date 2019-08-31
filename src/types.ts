export enum UpdateType {
  Cache,
  Incremental,
  Full,
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
  forceSkip?: boolean
  progressBar?: boolean
  codes?: string[]
  callback?: (info: {
    value: number
    total: number
    code: string
    type: UpdateType
  }) => any
}
