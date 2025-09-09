from flask import Blueprint, jsonify, request, session, render_template
from app import db
from app.models.estilo import Estilo
from app.models.usuario import Usuario
from app.models.notificacion import Notificacion
import cloudinary.uploader

estilos_bp = Blueprint('estilos', __name__)

# Página pública de estilos
@estilos_bp.route('/estilos', methods=['GET'])
def pagina_estilos():
    return render_template('estilo/estilos.html')

# Listar estilos
@estilos_bp.route('/api/estilos', methods=['GET'])
def listar_estilos():
    estilos = Estilo.query.order_by(Estilo.id.desc()).all()
    return jsonify([{
        'id': e.id,
        'nombre': e.nombre,
        'categoria': e.categoria,
        'imagen_url': e.imagen_url,
        'activo': e.activo
    } for e in estilos])

# Crear estilo
@estilos_bp.route('/api/estilos', methods=['POST'])
def crear_estilo():
    if session.get('rol') != 'admin':
        return jsonify({'error': 'Acceso no autorizado'}), 403
    try:
        data = request.form
        nombre = data.get('nombre','').strip()
        categoria = data.get('categoria','').strip()
        if not nombre or not categoria:
            return jsonify({'error':'Nombre y categoría requeridos'}),400
        imagen = request.files.get('imagen')
        imagen_url = None
        if imagen and imagen.filename:
            up = cloudinary.uploader.upload(imagen)
            imagen_url = up['secure_url']
        activo = bool(data.get('activo') in ['on','true','1'])
        estilo = Estilo(nombre=nombre, categoria=categoria, imagen_url=imagen_url, activo=activo)
        db.session.add(estilo)
        db.session.commit()
        # Notificar a clientes sobre nuevo estilo
        try:
            clientes = Usuario.query.filter(Usuario.rol != 'admin').all()
            for u in clientes:
                n = Notificacion(
                    usuario_id=u.id,
                    titulo='Nuevo estilo agregado',
                    mensaje=f"Se agregó un nuevo estilo: {nombre}",
                    tipo='estilo',
                    prioridad='baja',
                    data={"url": "/estilos"}
                )
                db.session.add(n)
            db.session.commit()
        except Exception:
            db.session.rollback()
        return jsonify({'message':'Estilo creado','id':estilo.id}),200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error':str(e)}),400

# Actualizar estilo
@estilos_bp.route('/api/estilos/<int:id>', methods=['PUT'])
def actualizar_estilo(id):
    if session.get('rol') != 'admin':
        return jsonify({'error': 'Acceso no autorizado'}), 403
    try:
        estilo = Estilo.query.get_or_404(id)
        data = request.form
        nombre = data.get('nombre','').strip()
        categoria = data.get('categoria','').strip()
        if not nombre or not categoria:
            return jsonify({'error':'Nombre y categoría requeridos'}),400
        estilo.nombre = nombre
        estilo.categoria = categoria
        estilo.activo = bool(data.get('activo') in ['on','true','1'])
        imagen = request.files.get('imagen')
        if imagen and imagen.filename:
            up = cloudinary.uploader.upload(imagen)
            estilo.imagen_url = up['secure_url']
        db.session.commit()
        return jsonify({'message':'Estilo actualizado'}),200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error':str(e)}),400

# Eliminar estilo
@estilos_bp.route('/api/estilos/<int:id>', methods=['DELETE'])
def eliminar_estilo(id):
    if session.get('rol') != 'admin':
        return jsonify({'error':'Acceso no autorizado'}),403
    try:
        estilo = Estilo.query.get_or_404(id)
        db.session.delete(estilo)
        db.session.commit()
        return jsonify({'message':'Estilo eliminado'}),200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error':str(e)}),400

# Cambiar activo
@estilos_bp.route('/api/estilos/<int:id>/activo', methods=['PATCH'])
def toggle_activo_estilo(id):
    if session.get('rol') != 'admin':
        return jsonify({'error':'Acceso no autorizado'}),403
    estilo = Estilo.query.get_or_404(id)
    data = request.get_json(force=True) or {}
    valor = data.get('activo')
    if isinstance(valor,str):
        valor = valor.lower() in ('1','true','t','on','si','sí')
    estilo.activo = bool(valor)
    db.session.commit()
    return jsonify({'message':'Estado actualizado','activo':estilo.activo}),200
