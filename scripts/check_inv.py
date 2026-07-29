import json
d = json.load(open('inv_check.json', encoding='utf-8'))
i = d['invoice']
print('status:', i['status'])
print('paid:', i['paid_amount'])
print('remaining:', i['total_amount'] - i['paid_amount'])
