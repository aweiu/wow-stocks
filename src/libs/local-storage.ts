import fs = require('fs')

export default class LocalStorage {
  private dbPath: string
  private data: any

  constructor(dbPath: string) {
    this.dbPath = dbPath
    try {
      this.data = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'))
    } catch (e) {
      this.data = {}
    }
  }

  public getItem<T = any>(key: string): T {
    return this.data[key]
  }

  public setItem(key: string, value: any) {
    this.data[key] = value
    fs.writeFileSync(this.dbPath, JSON.stringify(this.data))
  }
}
