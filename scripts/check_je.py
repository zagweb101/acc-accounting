import json
e = json.load(open('entries2.json', encoding='utf-8'))['entries'][0]
print(e['entry_number'] + ':', e['description'], '=', e['total_debit'])
