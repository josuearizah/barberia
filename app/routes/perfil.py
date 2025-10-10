from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for, current_app
from app.models.usuario import Usuario
from app.models.perfil import Perfil
from app import db
import json
import os
import cloudinary.uploader

perfil_bp = Blueprint('perfil', __name__)

def _parse_redes(perfil: Perfil):
    redes = []
    if perfil and perfil.redes_sociales:
        try:
            data = json.loads(perfil.redes_sociales)
            if isinstance(data, list):
                for idx, r in enumerate(data):
                    # Espera campos: platform/red_social, username/enlace
                    platform = (r.get('platform') or r.get('red_social') or '').lower()
                    username = r.get('username') or r.get('enlace') or ''
                    if platform and username:
                        redes.append({
                            'id': r.get('id') or str(idx),
                            'platform': platform,
                            'username': username
                        })
        except Exception:
            pass
    return redes


def _extract_public_id(image_url: str) -> str:
    if not image_url:
        return None
    try:
        path = image_url.split('/upload/', 1)[1]
        path = path.split('?', 1)[0]
        if path.startswith('v') and '/' in path:
            path = path.split('/', 1)[1]
        if path.startswith('v') and path[1:].isdigit():
            return None
        return os.path.splitext(path)[0]
    except Exception:
        return None

@perfil_bp.route('/perfil')
def perfil():
    if 'usuario_id' not in session:
        return redirect(url_for('auth.login'))
    usuario = Usuario.query.get(session['usuario_id'])
    if not usuario:
        return redirect(url_for('auth.login'))

    perfil = Perfil.query.filter_by(usuario_id=usuario.id).first()
    if not perfil:
        perfil = Perfil(usuario_id=usuario.id, descripcion=None, imagen=None, redes_sociales=json.dumps([]))
        db.session.add(perfil)
        db.session.commit()

    redes = _parse_redes(perfil)

    social_platforms = {
        'instagram': {'name': 'Instagram', 'icon': 'fab fa-instagram', 'color': 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600'},
        'facebook': {'name': 'Facebook', 'icon': 'fab fa-facebook', 'color': 'bg-blue-600'},
        'x': {'name': 'X', 'icon': 'fa-brands fa-x-twitter', 'color': 'bg-black text-white'},
        'linkedin': {'name': 'LinkedIn', 'icon': 'fab fa-linkedin', 'color': 'bg-blue-700'},
        'youtube': {'name': 'YouTube', 'icon': 'fab fa-youtube', 'color': 'bg-red-600'},
        'tiktok': {'name': 'TikTok', 'icon': 'fab fa-tiktok', 'color': 'bg-black'},
        'whatsapp': {'name': 'WhatsApp', 'icon': 'fab fa-whatsapp', 'color': 'bg-green-500'},
    }
    return render_template('usuario/perfil.html', usuario=usuario, perfil=perfil, redes=redes, social_platforms=social_platforms)

@perfil_bp.route('/perfil/<int:usuario_id>')
def perfil_publico(usuario_id):
    usuario = Usuario.query.get_or_404(usuario_id)
    perfil = Perfil.query.filter_by(usuario_id=usuario.id).first()
    redes = _parse_redes(perfil)

    social_platforms = {
        'instagram': {'name': 'Instagram', 'icon': 'fab fa-instagram', 'color': 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600'},
        'facebook': {'name': 'Facebook', 'icon': 'fab fa-facebook', 'color': 'bg-blue-600'},
        'x': {'name': 'X', 'icon': 'fa-brands fa-x-twitter', 'color': 'bg-black text-white'},
        'linkedin': {'name': 'LinkedIn', 'icon': 'fab fa-linkedin', 'color': 'bg-blue-700'},
        'youtube': {'name': 'YouTube', 'icon': 'fab fa-youtube', 'color': 'bg-red-600'},
        'tiktok': {'name': 'TikTok', 'icon': 'fab fa-tiktok', 'color': 'bg-black'},
        'whatsapp': {'name': 'WhatsApp', 'icon': 'fab fa-whatsapp', 'color': 'bg-green-500'},
    }
    return render_template('usuario/perfil.html', usuario=usuario, perfil=perfil, redes=redes, social_platforms=social_platforms)

@perfil_bp.route('/perfil/datos')
def obtener_datos():
    if 'usuario_id' not in session:
        return jsonify({'success': False, 'message': 'No autorizado'}), 401
    usuario = Usuario.query.get(session['usuario_id'])
    if not usuario:
        return jsonify({'success': False, 'message': 'Usuario no encontrado'}), 404
    perfil = Perfil.query.filter_by(usuario_id=usuario.id).first()
    redes = _parse_redes(perfil)
    return jsonify({
        'success': True,
        'usuario': {
            'id': usuario.id,
            'nombre': usuario.nombre,
            'apellido': usuario.apellido,
            'correo': usuario.correo,
            'telefono': usuario.telefono,
        },
        'perfil': {
            'descripcion': perfil.descripcion if perfil else None,
            'imagen': perfil.imagen if perfil else None,
            'profileImage': perfil.imagen if perfil else None,
            'redes_sociales': redes,
        },
        'profile': {
            'name': f"{usuario.nombre} {usuario.apellido}".strip(),
            'profileImage': perfil.imagen if perfil else None,
        }
    })

@perfil_bp.route('/perfil/guardar', methods=['POST'])
def guardar_perfil():
    if 'usuario_id' not in session:
        return jsonify({'success': False, 'message': 'No autorizado'}), 401
    usuario = Usuario.query.get(session['usuario_id'])
    if not usuario:
        return jsonify({'success': False, 'message': 'Usuario no encontrado'}), 404

    data = request.get_json() or {}
    usuario.nombre = data.get('nombre', usuario.nombre)
    usuario.apellido = data.get('apellido', usuario.apellido)
    telefono = (data.get('telefono') or '').strip()
    usuario.telefono = telefono or None

    perfil = Perfil.query.filter_by(usuario_id=usuario.id).first()
    if not perfil:
        perfil = Perfil(usuario_id=usuario.id)
        db.session.add(perfil)

    perfil.descripcion = data.get('descripcion', perfil.descripcion)

    redes = data.get('redes_sociales')
    if isinstance(redes, list):
        # Normalizar campos
        normalizadas = []
        for idx, r in enumerate(redes):
            platform = (r.get('platform') or r.get('red_social') or '').lower()
            username = r.get('username') or r.get('enlace') or ''
            if platform and username:
                normalizadas.append({'id': r.get('id') or str(idx), 'platform': platform, 'username': username})
        perfil.redes_sociales = json.dumps(normalizadas)

    db.session.commit()
    return jsonify({'success': True})

@perfil_bp.route('/perfil/subir-imagen', methods=['POST'])
def subir_imagen():
    if 'usuario_id' not in session:
        return jsonify({'success': False, 'message': 'No autorizado'}), 401

    imagen = request.files.get('file')
    if not imagen or not imagen.filename:
        return jsonify({'success': False, 'message': 'Archivo no proporcionado'}), 400

    extension = os.path.splitext(imagen.filename)[1].lower().lstrip('.')
    if extension and extension not in {'jpg', 'jpeg', 'png', 'gif', 'webp'}:
        return jsonify({'success': False, 'message': 'Formato de imagen no permitido'}), 400

    try:
        upload_result = cloudinary.uploader.upload(imagen, folder='perfil')
        image_url = upload_result.get('secure_url')
        if not image_url:
            raise ValueError('No se recibio URL de la imagen')

        perfil = Perfil.query.filter_by(usuario_id=session['usuario_id']).first()
        if not perfil:
            perfil = Perfil(usuario_id=session['usuario_id'])
            db.session.add(perfil)

        perfil.imagen = image_url
        db.session.commit()

        return jsonify({'success': True, 'image_url': image_url})
    except Exception as exc:
        current_app.logger.exception('Error al subir imagen de perfil: %s', exc)
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Error al subir imagen'}), 500

@perfil_bp.route('/perfil/eliminar-imagen', methods=['POST'])
def eliminar_imagen():
    if 'usuario_id' not in session:
        return jsonify({'success': False, 'message': 'No autorizado'}), 401

    perfil = Perfil.query.filter_by(usuario_id=session['usuario_id']).first()
    if not perfil or not perfil.imagen:
        return jsonify({'success': True, 'image_url': None})

    old_url = perfil.imagen
    perfil.imagen = None
    try:
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception('Error al eliminar imagen de perfil: %s', exc)
        return jsonify({'success': False, 'message': 'Error al eliminar imagen'}), 500

    public_id = _extract_public_id(old_url)
    if public_id:
        try:
            cloudinary.uploader.destroy(public_id)
        except Exception as exc:
            current_app.logger.warning('No se pudo eliminar imagen en Cloudinary: %s', exc)

    return jsonify({'success': True, 'image_url': None})

# -------- Seguridad: verificar, cambiar contraseña y eliminar cuenta --------

@perfil_bp.route('/perfil/verificar-contrasena', methods=['POST'])
def verificar_contrasena():
    if 'usuario_id' not in session:
        return jsonify({'success': False, 'message': 'No autorizado'}), 401
    data = request.get_json() or {}
    password = (data.get('password') or '').strip()
    if not password:
        return jsonify({'success': False, 'message': 'Contraseña requerida'}), 400

    usuario = Usuario.query.get(session['usuario_id'])
    if not usuario:
        return jsonify({'success': False, 'message': 'Usuario no encontrado'}), 404

    if usuario.check_password(password):
        session['delete_verified'] = True
        return jsonify({'success': True})
    else:
        # Indicamos al front a dónde redirigir por si desea usar "olvidaste tu contraseña"
        return jsonify({
            'success': False,
            'message': 'Contraseña incorrecta',
            'redirect': url_for('auth.reset_password')
        }), 400

@perfil_bp.route('/perfil/cambiar-contrasena', methods=['POST'])
def cambiar_contrasena():
    if 'usuario_id' not in session:
        return jsonify({'success': False, 'message': 'No autorizado'}), 401

    data = request.get_json() or {}
    current_password = (data.get('current_password') or '').strip()
    new_password = (data.get('new_password') or '').strip()
    confirm_password = (data.get('confirm_password') or '').strip()

    if not current_password or not new_password or not confirm_password:
        return jsonify({'success': False, 'message': 'Todos los campos son obligatorios'}), 400

    usuario = Usuario.query.get(session['usuario_id'])
    if not usuario:
        return jsonify({'success': False, 'message': 'Usuario no encontrado'}), 404

    if not usuario.check_password(current_password):
        return jsonify({
            'success': False,
            'message': 'La contraseña actual es incorrecta',
            'redirect': url_for('auth.reset_password')
        }), 400

    if new_password != confirm_password:
        return jsonify({'success': False, 'message': 'Las contraseñas no coinciden'}), 400

    # Validación mínima
    if len(new_password) < 8:
        return jsonify({'success': False, 'message': 'La contraseña debe tener mínimo 8 caracteres'}), 400

    usuario.set_password(new_password)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Contraseña actualizada'})

@perfil_bp.route('/perfil/eliminar', methods=['POST'])
def eliminar_cuenta():
    if 'usuario_id' not in session:
        return jsonify({'success': False, 'message': 'No autorizado'}), 401

    if not session.get('delete_verified'):
        return jsonify({'success': False, 'message': 'Validación requerida'}), 400

    usuario = Usuario.query.get(session['usuario_id'])
    if not usuario:
        return jsonify({'success': False, 'message': 'Usuario no encontrado'}), 404

    # Eliminar el perfil primero
    perfil = Perfil.query.filter_by(usuario_id=usuario.id).first()
    if perfil:
        db.session.delete(perfil)

    db.session.delete(usuario)
    db.session.commit()

    session.clear()
    # Redirige al login tras eliminar
    return jsonify({'success': True, 'redirect': url_for('auth.login')})
