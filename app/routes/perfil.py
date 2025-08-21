from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from app.models.usuario import Usuario
from app.models.perfil import Perfil
from app import db
import cloudinary.uploader
import json

perfil_bp = Blueprint('perfil', __name__)

@perfil_bp.route('/perfil')
def perfil():
    if 'usuario_id' not in session:
        return redirect(url_for('auth.login'))
    usuario = Usuario.query.get(session['usuario_id'])
    if not usuario:
        return redirect(url_for('auth.login'))
    perfil = Perfil.query.filter_by(usuario_id=usuario.id).first()
    if not perfil:
        perfil = Perfil(usuario_id=usuario.id)
        db.session.add(perfil)
        db.session.commit()
    return render_template('usuario/perfil.html', usuario=usuario, perfil=perfil)

@perfil_bp.route('/perfil/datos')
def obtener_datos():
    if 'usuario_id' not in session:
        return jsonify({'success': False}), 401
    usuario = Usuario.query.get(session['usuario_id'])
    perfil = Perfil.query.filter_by(usuario_id=usuario.id).first()
    redes = []
    if perfil and perfil.redes_sociales:
        try:
            raw = json.loads(perfil.redes_sociales)
            for idx, r in enumerate(raw):
                redes.append({
                    'id': idx,
                    'platform': r.get('red_social', ''),
                    'username': r.get('enlace', '')
                })
        except:
            pass
    return jsonify({
        'success': True,
        'profile': {
            'name': f'{usuario.nombre} {usuario.apellido}'.strip(),
            'phone': usuario.telefono or '',
            'description': perfil.descripcion if perfil else '',
            'profileImage': perfil.imagen if perfil else None
        },
        'socialNetworks': redes
    })

@perfil_bp.route('/perfil/guardar', methods=['POST'])
def guardar_perfil():
    if 'usuario_id' not in session:
        return jsonify({'success': False}), 401
    usuario = Usuario.query.get(session['usuario_id'])
    perfil = Perfil.query.filter_by(usuario_id=usuario.id).first()
    if not perfil:
        perfil = Perfil(usuario_id=usuario.id)
        db.session.add(perfil)
    data = request.get_json() or {}
    profile = data.get('profile', {})
    redes = data.get('socialNetworks', [])
    # nombre / apellido
    if profile.get('name'):
        partes = profile['name'].split(' ', 1)
        usuario.nombre = partes[0]
        usuario.apellido = partes[1] if len(partes) > 1 else ''
        session['nombre'] = usuario.nombre
        session['apellido'] = usuario.apellido
    if 'phone' in profile:
        usuario.telefono = profile['phone'] or ''
        session['telefono'] = usuario.telefono
    if 'description' in profile:
        perfil.descripcion = profile['description'] or ''
    if 'profileImage' in profile:
        perfil.imagen = profile['profileImage']
    # redes
    lista_redes = []
    for r in redes:
        lista_redes.append({
            'red_social': r.get('platform', ''),
            'enlace': r.get('username', '')
        })
    perfil.redes_sociales = json.dumps(lista_redes)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Guardado'})

@perfil_bp.route('/perfil/subir-imagen', methods=['POST'])
def subir_imagen():
    if 'usuario_id' not in session:
        return jsonify({'success': False}), 401
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'Archivo faltante'}), 400
    file = request.files['file']
    if not file.filename:
        return jsonify({'success': False, 'message': 'Nombre vacío'}), 400
    result = cloudinary.uploader.upload(
        file,
        folder='barberia/perfiles',
        transformation=[{'width': 400, 'height': 400, 'crop': 'fill'}, {'quality': 'auto'}]
    )
    usuario = Usuario.query.get(session['usuario_id'])
    perfil = Perfil.query.filter_by(usuario_id=usuario.id).first()
    perfil.imagen = result['secure_url']
    db.session.commit()
    return jsonify({'success': True, 'image_url': result['secure_url']})