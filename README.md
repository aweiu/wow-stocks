# wow-stocks

实时获取所有 A 股现在 + 过去的行情数据，可基于它来做量化交易的行情服务，也可以用来实时选股。

## 示例

```javascript
import { update } from 'wow-stocks'
import { ma, cross } from 'wow-stock-calculator'

update({ length: 90 }).then(({ watch }) => {
  watch((stocks) => {
    // 获取当前 5 日均线上穿 10 日均线的所有股票
    console.log(
      stocks.filter((stock) => {
        const ma5 = ma(stock.close, 5)
        const ma10 = ma(stock.close, 10)
        const ma5CrossMa10 = cross(ma5, ma10)
        return ma5CrossMa10[ma5CrossMa10.length - 1]
      }),
    )
  })
})
```

## 文档

https://aweiu.com/documents/wow-stocks/
