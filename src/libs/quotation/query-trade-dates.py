import sys
import baostock as bs
import pandas as pd

lg = bs.login()
rs = bs.query_trade_dates(start_date=sys.argv[1], end_date=sys.argv[2])
data_list = []
while (rs.error_code == '0') & rs.next():
    data_list.append(rs.get_row_data())
result = pd.DataFrame(data_list, columns=rs.fields)
print(result.to_json(orient='records'))
bs.logout()
