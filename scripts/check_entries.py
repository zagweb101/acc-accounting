import json
d = json.load(open('entries.json', encoding='utf-8'))
for e in d['entries'][:5]:
    print(f"{e['entry_number']:16s} {e['description']:30s} {e['total_debit']:>8.0f} {e['entry_date']}")
