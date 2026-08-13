import json

with open('scratch/coords_137_3_compact.js', 'r', encoding='utf-8') as f:
    text = f.read()
    
# Extraer la parte del JSON
json_text = text.replace('const COORDS_137_3 = ', '').rstrip(';')
data = json.loads(json_text)
compact_json = json.dumps(data)

with open('scratch/coords_137_3_one_line.js', 'w', encoding='utf-8') as f:
    f.write(f"const COORDS_137_3 = {compact_json};")
print("One line coordinates written to scratch/coords_137_3_one_line.js")
