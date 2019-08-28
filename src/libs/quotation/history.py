import sys
import baostock as bs
import pandas as pd

bs.login()
for line in sys.stdin:
    codesStr = line[:-1]

codes = codesStr.split(',')
for code in codes:
    k_rs = bs.query_history_k_data_plus(code, "date,code,open,high,low,close,volume,amount,turn,tradestatus")
    print(k_rs.get_data().to_json(orient='records'))
bs.logout()
