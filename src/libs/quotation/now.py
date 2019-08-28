import json
import easyquotation
from datetime import date, datetime
class DatetimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.strftime('%Y-%m-%d %H:%M:%S')
        elif isinstance(obj, date):
            return obj.strftime('%Y-%m-%d')
        else:
            return json.JSONEncoder.default(self, obj)
quotation = easyquotation.use('tencent')
print(json.dumps(quotation.market_snapshot(prefix=True), cls=DatetimeEncoder))
