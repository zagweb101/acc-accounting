import json
d = json.load(open('tb.json', encoding='utf-8'))
codes = ['1100','1200','1300','2100','2200','4100','5100']
for r in d['rows']:
    if r['code'] in codes:
        print(f"{r['code']:6s} {r['name_ar']:20s} مدين={r['total_debit']:>8.0f} دائن={r['total_credit']:>8.0f} رصيد={r['balance']:>8.0f}")
print()
print(f"المجموع: مدين={d['totals']['debit']:.0f} دائن={d['totals']['credit']:.0f}")
