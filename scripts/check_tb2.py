import json
d = json.load(open('tb2.json', encoding='utf-8'))
codes = ['1100','1200','1300','2100','2200']
for r in d['rows']:
    if r['code'] in codes:
        print(r['code'], r['name_ar'], 'balance:', r['balance'])
