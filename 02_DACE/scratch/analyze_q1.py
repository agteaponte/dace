import pdfplumber
import json

def inspect_q1_details(filepath):
    with pdfplumber.open(filepath) as pdf:
        page = pdf.pages[0]
        words = page.extract_words()
        
        print("=== Text positions in Q1 ===")
        # Busquemos los checkboxes del trabajo solicitado
        for w in words:
            text = w['text']
            if text in ['Carpintería', 'Electricidad', 'Pintura', 'Refrigeración', 'Ebanistería', 'Limpieza', 'Plomería']:
                print(f"Option: {text:15} x0={w['x0']:.1f}, top={w['top']:.1f}")
                
        # Cabeceras de las tablas para determinar los centros de las celdas
        headers = [
            'Unidad Solicitante', 'Área', 'Director/supervisor solicita',
            'Fecha',
            'DESCRIPCIÓN SERVICIO SOLICITADO',
            'Sección', 'División', 'Distrito/Precinto', 'Área',
            'Negociado', 'Superintendencia Auxiliar',
            'Firma del Solicitante', 'Teléfono de contacto',
            'Autorizado por', 'Fecha',
            'Se autoriza a', 'A viajar a',
            'Tablilla vehículo', 'Acompañante'
        ]
        
        print("\n=== Header positions in Q1 ===")
        for h in headers:
            # Buscar la secuencia de palabras de la cabecera
            h_words = h.split()
            # Encontrar dónde empieza
            for i in range(len(words) - len(h_words) + 1):
                match = True
                for j in range(len(h_words)):
                    if words[i+j]['text'].lower().replace('/', '').replace(':', '') != h_words[j].lower().replace('/', '').replace(':', ''):
                        match = False
                        break
                if match:
                    x0 = words[i]['x0']
                    top = words[i]['top']
                    print(f"Header: {h:30} x0={x0:.1f}, top={top:.1f}")

if __name__ == '__main__':
    inspect_q1_details('PPR-137.1.pdf')
