import json
d = json.load(open('items.json', encoding='utf-8'))
for i in d['items']:
    if i['sku'] == 'RT-100':
        print(f"مخزون {i['name']}: {i['stock_quantity']} (سعر التكلفة: {i['cost_price']})")
