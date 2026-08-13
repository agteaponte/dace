import json

def generate_compact_js():
    with open('scratch/inspections_coords.json', 'r', encoding='utf-8') as f:
        coords = json.load(f)
        
    compact = {}
    for sec, items in coords.items():
        compact[sec] = []
        # Asegurar ordenados por el índice
        sorted_items = sorted(items, key=lambda x: x['index'])
        for item in sorted_items:
            compact[sec].append([item['page'], round(item['y'], 1)])
            
    js_content = "const COORDS_137_3 = " + json.dumps(compact, indent=2) + ";"
    with open('scratch/coords_137_3_compact.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
    print("Compact JS written to scratch/coords_137_3_compact.js")

if __name__ == '__main__':
    generate_compact_js()
