import sys
import baostock as bs
import pandas as pd

bs.login()
stock_rs = bs.query_all_stock().get_data()
print(len(stock_rs))
bs.logout()
