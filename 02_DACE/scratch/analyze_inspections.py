import re
import json

def parse_layout(filepath):
    sections_mapping = {
        'ext': ['Portón de entrada', 'Verja periferal', 'Estacionamiento', 'Parrillas Pluviales', 'Estación de Basura', 'Luminarias y Postes', 'Hidrante', 'Mangueras', 'Áreas Verdes', 'Astas de Banderas', 'Pintura Exterior', 'Iluminación Perímetro', 'Rotulación'],
        'int': ['Portones', 'Pasamanos', 'Rejas', 'Pintura', 'Áreas verdes', 'Gazebo', 'Paredes', 'Pisos', 'Aceras', 'Rampas', 'Iluminación', 'Desagües pluviales', 'Barandas', 'Juntas de Expansión'],
        'com': ['Enchapado', 'Campana de Extracción', 'Plomería', 'Trampa de grasa', 'Walk-in Cooler', 'Calentador de agua', 'Sistema de Gas', 'Ventanas', 'Puertas', 'Baños', 'Luminarias'],
        'adm': ['A/C', 'Paredes', 'Piso', 'Baños', 'Pintura', 'Enfriador de Agua', 'ADA', 'Iluminación', 'Ventanas', 'Plafón', 'Intercom', 'Timbre'],
        'bib': ['A/C', 'Paredes', 'Pisos', 'Oficina Bibliotecario', 'Ventanas', 'Pinturas', 'Puertas', 'Luminaria'],
        'aca': ['Salones', 'Pizarras', 'Iluminación', 'Receptáculos', 'Puertas', 'Gabinetes', 'Abanicos', 'Ventanas', 'Pintura'],
        'ban': ['Enchapado', 'Particiones', 'Ventanas', 'Drenajes', 'Inodoros', 'Lavamanos', 'Urinales', 'Llaves', 'Extractores', 'Pintura', 'ADA'],
        'tec': ['Acceso', 'Escotillas', 'Drenajes', 'Limpieza', 'Empozamientos', 'Filtraciones', 'Tratamiento'],
        'can': ['Canastos', 'Portones', 'Rejas y Barandas', 'Estructura', 'Gradas', 'Iluminación', 'Piso', 'Control Palomas', 'Extractores', 'Baños', 'Fuentes', 'Abanicos', 'Filtraciones', 'Drenajes'],
        'seg': ['Intercomunicador', 'Alarma incendios', 'Gabinetes Mangueras', 'Extintores', 'Luces Salida', 'Luces Emergencia', 'Sistema Seguridad'],
        'ele': ['Subestación', 'Paneles Eléctricos', 'Distribución', 'Bombeo Agua', 'Bombeo Sanitario', 'Planta Tratamiento', 'Tanques', 'Leaching Field', 'Energía Renovable', 'Generador', 'Fuentes Agua', 'Cisterna', 'A/C', 'Elevadores', 'Montasillas'],
        'dor': ['Pintura', 'Ventanas', 'Puertas', 'Linternas', 'Pisos', 'Duchas', 'Aire', 'Lavamanos']
    }

    # Leer el archivo de layout
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    pages = content.split('--- Page ')
    
    extracted_positions = {}
    
    for page_chunk in pages[1:]:
        lines = page_chunk.split('\n')
        page_num_match = re.match(r'^(\d+)', lines[0])
        if not page_num_match:
            continue
        page_num = int(page_num_match.group(1))
        
        for line in lines:
            text_match = re.search(r'Text \(y=([\d.]+), x=([\d.]+)\): (.*)$', line)
            if text_match:
                y = float(text_match.group(1))
                x = float(text_match.group(2))
                text = text_match.group(3).strip()
                
                # Buscar coincidencias para los campos de la cabecera
                # Cabecera de Página 1
                header_fields = [
                    ('Num. Proyecto AEP', 'Núm. Proyecto AEP'),
                    ('Precinto/Distrito/Unidad', 'Precinto/Distrito/Unidad'),
                    ('Area', 'Área'),
                    ('Nombre Director', 'Nombre Director'),
                    ('Telefono', 'Teléfono'),
                    ('Direccion', 'Dirección'),
                    ('Fecha', 'Fecha')
                ]
                
                # Guardar texto con sus coordenadas para procesar
                if page_num not in extracted_positions:
                    extracted_positions[page_num] = []
                extracted_positions[page_num].append({'y': y, 'x': x, 'text': text})

    # Asignación de páginas oficiales para cada sección
    section_pages = {
        'ext': [1],
        'int': [1],
        'com': [2],
        'adm': [2],
        'bib': [2],
        'aca': [3],
        'ban': [3],
        'tec': [3],
        'can': [3],
        'seg': [3, 4],
        'ele': [4],
        'dor': [4]
    }

    # Ahora procesemos por sección
    result_mapping = {}
    
    # Mapeo manual para encontrar las posiciones de los items de cada sección en base al texto
    for sec, items in sections_mapping.items():
        result_mapping[sec] = []
        allowed_pages = section_pages[sec]
        for i, item in enumerate(items):
            found = False
            # Buscar el item en los textos extraídos
            for p_num in allowed_pages:
                if p_num not in extracted_positions:
                    continue
                p_texts = extracted_positions[p_num]
                for t in p_texts:
                    # Coincidencia flexible de texto
                    # e.g. "1. Portón de entrada" coincide con "Portón de entrada"
                    # o sub-ítems como "a. condición asfalto" coincide con "condición asfalto"
                    clean_text = t['text'].lower()
                    clean_item = item.lower()
                    
                    # Normalizar cadenas eliminando preposiciones e intentando emparejar
                    clean_text_noprefix = re.sub(r'^\s*([0-9]+|[a-z])\.\s*', '', clean_text)
                    clean_text_noprefix = re.sub(r'\s+', '', clean_text_noprefix).replace('de', '').replace('contra', '').replace('potable', '').replace('general', '')
                    clean_item_norm = re.sub(r'\s+', '', clean_item).replace('de', '').replace('contra', '').replace('potable', '').replace('general', '')
                    
                    # Casos especiales de mapeo manual
                    special_match = False
                    if sec == 'can' and item == 'Control Palomas' and 'control' in clean_text and 'paloma' in clean_text:
                        special_match = True
                    elif sec == 'seg' and item == 'Gabinetes Mangueras' and 'gabinete' in clean_text and 'manguera' in clean_text:
                        special_match = True
                    elif sec == 'seg' and item == 'Luces Salida' and 'luces' in clean_text and 'salida' in clean_text:
                        special_match = True
                    elif sec == 'seg' and item == 'Luces Emergencia' and 'luces' in clean_text and 'emergencia' in clean_text:
                        special_match = True
                    elif sec == 'seg' and item == 'Sistema Seguridad' and 'sistema' in clean_text and 'seguridad' in clean_text:
                        special_match = True
                    elif sec == 'ele' and item == 'Bombeo Agua' and 'bombeo' in clean_text and 'agua' in clean_text and 'potable' in clean_text:
                        special_match = True
                    elif sec == 'ele' and item == 'Planta Tratamiento' and 'planta' in clean_text and 'tratamiento' in clean_text:
                        special_match = True
                    elif sec == 'ele' and item == 'Fuentes Agua' and 'fuente' in clean_text and 'agua' in clean_text:
                        # Evitar que se empareje en el lugar equivocado, verificar número de página
                        if p_num == 4 and 'fuente' in clean_text:
                            special_match = True

                    if special_match or clean_item_norm in clean_text_noprefix or clean_text_noprefix in clean_item_norm:
                        result_mapping[sec].append({
                            'index': i,
                            'name': item,
                            'page': p_num,
                            'y': t['y'],
                            'x': t['x'],
                            'matched_text': t['text']
                        })
                        found = True
                        break
                if found:
                    break
            if not found:
                print(f"WARNING: Could not find position for {sec} item {i}: {item}")
                
    with open('scratch/inspections_coords.json', 'w', encoding='utf-8') as f:
        json.dump(result_mapping, f, indent=2, ensure_ascii=False)
    print("Coordinates extracted and written to scratch/inspections_coords.json")

if __name__ == '__main__':
    parse_layout('layout_137_3.txt')
