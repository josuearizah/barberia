from flask import Blueprint, jsonify, request, flash, redirect, url_for, session
from app import db
from app.models.servicio import Servicio
import cloudinary.uploader
from datetime import time

servicios_bp = Blueprint('servicios', __name__)

# Listar servicios (accesible para todos)
@servicios_bp.route('/api/servicios', methods=['GET'])
def listar_servicios():
    servicios = Servicio.query.all()
    return jsonify([{
        'id': s.id,
        'nombre': s.nombre,
        'descripcion': s.descripcion,
        'precio': float(s.precio),
        'duracion': s.duracion.hour * 60 + s.duracion.minute if s.duracion else 0,
        'imagen_url': s.imagen_url
    } for s in servicios])

# Crear servicio (solo admins)
@servicios_bp.route('/api/servicios', methods=['POST'])
def crear_servicio():
    if session.get('rol') != 'admin':
        return jsonify({'error': 'Acceso no autorizado'}), 403
    try:
        data = request.form
        imagen = request.files.get('imagen')
        imagen_url = None
        if imagen:
            upload_result = cloudinary.uploader.upload(imagen)
            imagen_url = upload_result['secure_url']
        
        # Convertir duración de minutos (entero) a objeto time
        duracion_minutos = int(data['duracion'])
        horas = duracion_minutos // 60
        minutos = duracion_minutos % 60
        duracion = time(hour=horas, minute=minutos)

        servicio = Servicio(
            nombre=data['nombre'],
            descripcion=data.get('descripcion', ''),
            precio=float(data['precio']),
            duracion=duracion,
            imagen_url=imagen_url
        )
        db.session.add(servicio)
        db.session.commit()
        return jsonify({'message': 'Servicio creado'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

# Actualizar servicio (solo admins)
@servicios_bp.route('/api/servicios/<int:id>', methods=['PUT'])
def actualizar_servicio(id):
    if session.get('rol') != 'admin':
        return jsonify({'error': 'Acceso no autorizado'}), 403
    try:
        servicio = Servicio.query.get_or_404(id)
        data = request.form
        imagen = request.files.get('imagen')

        servicio.nombre = data['nombre']
        servicio.descripcion = data.get('descripcion', '')
        servicio.precio = float(data['precio'])
        
        # Convertir duración de minutos a time
        duracion_minutos = int(data['duracion'])
        horas = duracion_minutos // 60
        minutos = duracion_minutos % 60
        servicio.duracion = time(hour=horas, minute=minutos)

        if imagen:
            upload_result = cloudinary.uploader.upload(imagen)
            servicio.imagen_url = upload_result['secure_url']

        db.session.commit()
        return jsonify({'message': 'Servicio actualizado'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

# Eliminar servicio (solo admins)
@servicios_bp.route('/api/servicios/<int:id>', methods=['DELETE'])
def eliminar_servicio(id):
    if session.get('rol') != 'admin':
        return jsonify({'error': 'Acceso no autorizado'}), 403
    try:
        servicio = Servicio.query.get_or_404(id)
        if servicio.imagen_url:
            public_id = servicio.imagen_url.split('/')[-1].split('.')[0]
            cloudinary.uploader.destroy(public_id)
        db.session.delete(servicio)
        db.session.commit()
        return jsonify({'message': 'Servicio eliminado'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400