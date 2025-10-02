import re
from app import create_app, db
from app.models.notificacion import Notificacion
from app.models.cita import Cita

# Mapas de reemplazo simples para mojibake común (UTF-8 mal decodificado como Latin-1 y re-encodificado)
REPLACEMENTS = {
    'Ã¡': 'á', 'Ã©': 'é', 'Ãí': 'í', 'Ã³': 'ó', 'Ãº': 'ú', 'Ãñ': 'ñ',
    'ÃÁ': 'Á', 'Ã‰': 'É', 'ÃÍ': 'Í', 'Ã“': 'Ó', 'Ãš': 'Ú', 'Ã‘': 'Ñ',
    'Â¡': '¡', 'Â¿': '¿', 'Â°': '°',
    'Ã¼': 'ü', 'Ãœ': 'Ü',
    'Ã\xa1': '¡', 'Ã\xa9': 'é'
}
# Casos de doble mojibake (aparece a veces 'reservÃƒÂ³')
DOUBLE_REPLACEMENTS = {
    'ÃƒÂ¡': 'á', 'ÃƒÂ©': 'é', 'ÃƒÂ­': 'í', 'ÃƒÂ³': 'ó', 'ÃƒÂº': 'ú', 'ÃƒÂ±': 'ñ',
    'Ãƒâ€šÃ¡': 'á', 'Ãƒâ€šÃ©': 'é', 'Ãƒâ€šÃ³': 'ó'
}

pattern = re.compile('|'.join(sorted([re.escape(k) for k in list(REPLACEMENTS.keys()) + list(DOUBLE_REPLACEMENTS.keys())], key=len, reverse=True)))

def fix_text(text: str) -> str:
    if not text or all(ord(c) < 128 for c in text):
        return text
    def _repl(match):
        s = match.group(0)
        return DOUBLE_REPLACEMENTS.get(s) or REPLACEMENTS.get(s) or s
    new_text = pattern.sub(_repl, text)
    return new_text

app = create_app()
with app.app_context():
    total_notif = 0
    total_citas = 0

    for notif in Notificacion.query.all():
        original_titulo = notif.titulo or ''
        original_mensaje = notif.mensaje or ''
        nuevo_titulo = fix_text(original_titulo)
        nuevo_mensaje = fix_text(original_mensaje)
        if nuevo_titulo != original_titulo or nuevo_mensaje != original_mensaje:
            notif.titulo = nuevo_titulo
            notif.mensaje = nuevo_mensaje
            total_notif += 1

    for cita in Cita.query.all():
        original_notas = cita.notas or ''
        original_nombre = cita.nombre_cliente or ''
        nuevo_notas = fix_text(original_notas)
        nuevo_nombre = fix_text(original_nombre)
        if nuevo_notas != original_notas:
            cita.notas = nuevo_notas
            total_citas += 1
        if nuevo_nombre != original_nombre:
            cita.nombre_cliente = nuevo_nombre
            total_citas += 1

    if total_notif or total_citas:
        db.session.commit()
        print(f"Arregladas {total_notif} notificaciones y {total_citas} campos de citas.")
    else:
        print("No se detectaron textos con mojibake para corregir.")
