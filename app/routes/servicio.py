from flask import Blueprint, jsonify, request, session
from app import db
from app.models.servicio import Servicio
from app.models.descuento import Descuento
import cloudinary.uploader
from datetime import time, date, datetime
from sqlalchemy import text

# Añade esta función al inicio del archivo, después de las importaciones

def procesar_fecha(fecha_str):

    if not fecha_str:
        return None
    try:
        # Intenta primero con el formato ISO estándar (YYYY-MM-DD)
        return date.fromisoformat(fecha_str)
    except ValueError:
        try:
            # Si falla, intenta analizar un datetime completo y extrae solo la fecha
            return datetime.fromisoformat(fecha_str.split('.')[0]).date()
        except ValueError:
            try:
                # Si aún falla, usa datetime.strptime con el formato específico
                return datetime.strptime(fecha_str, '%Y-%m-%d %H:%M:%S.%f').date()
            except ValueError:
                print(f"No se pudo procesar la fecha: {fecha_str}")
                return None

servicios_bp = Blueprint('servicios', __name__)

@servicios_bp.route('/api/servicios', methods=['GET'])
def listar_servicios():
    try:
        servicios = Servicio.query.all()
        resultado = []
        
        for s in servicios:
            try:
                servicio_dict = {
                    'id': s.id,
                    'nombre': s.nombre,
                    'descripcion': s.descripcion,
                    'precio': float(s.precio),
                    'duracion': s.duracion.strftime('%H:%M'),
                    'duracion_minutos': s.duracion.hour * 60 + s.duracion.minute,
                    'imagen_url': s.imagen_url,
                    'descuento': None  # Por defecto no hay descuento
                }
                
                if hasattr(s, 'descuento') and s.descuento:
                    precio_final = 0
                    if s.descuento.tipo == 'porcentaje':
                        precio_final = float(s.precio) * (1 - float(s.descuento.valor) / 100)
                    else:  # cantidad
                        precio_final = float(s.precio) - float(s.descuento.valor)
                        precio_final = max(0, precio_final)  # No permitir precios negativos
                    
                    servicio_dict['descuento'] = {
                        'tipo': s.descuento.tipo,
                        'valor': float(s.descuento.valor),
                        'fecha_inicio': s.descuento.fecha_inicio.strftime('%Y-%m-%d') if s.descuento.fecha_inicio else None,
                        'fecha_fin': s.descuento.fecha_fin.strftime('%Y-%m-%d') if s.descuento.fecha_fin else None,
                        'precio_final': precio_final
                    }
                
                resultado.append(servicio_dict)
            except Exception as e:
                print(f"Error al procesar servicio {s.id}: {str(e)}")
                
        return jsonify(resultado), 200
    except Exception as e:
        print(f"Error general al listar servicios: {str(e)}")
        return jsonify({'error': str(e)}), 500

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
        db.session.commit()  # Commit primero para obtener el ID del servicio

        if 'descuento_tipo' in data and data.get('descuento_valor'):
            valor = float(data['descuento_valor']) if data.get('descuento_valor') else 0
            if valor > 0:
                fecha_inicio_str = data.get('descuento_fecha_inicio')
                fecha_fin_str = data.get('descuento_fecha_fin')
                
                # Convertir correctamente la fecha
                try:
                    # Intenta primero con el formato ISO estándar (YYYY-MM-DD)
                    fecha_inicio = date.fromisoformat(fecha_inicio_str) if fecha_inicio_str else date.today()
                except ValueError:
                    try:
                        # Si falla, intenta analizar un datetime completo y extrae solo la fecha
                        fecha_inicio = datetime.fromisoformat(fecha_inicio_str.split('.')[0]).date() if fecha_inicio_str else date.today()
                    except ValueError:
                        # Si aún falla, usa datetime.strptime con el formato específico
                        fecha_inicio = datetime.strptime(fecha_inicio_str, '%Y-%m-%d %H:%M:%S.%f').date() if fecha_inicio_str else date.today()
                
                # Similar para fecha_fin
                if fecha_fin_str:
                    try:
                        fecha_fin = date.fromisoformat(fecha_fin_str)
                    except ValueError:
                        try:
                            fecha_fin = datetime.fromisoformat(fecha_fin_str.split('.')[0]).date()
                        except ValueError:
                            fecha_fin = datetime.strptime(fecha_fin_str, '%Y-%m-%d %H:%M:%S.%f').date()
                else:
                    fecha_fin = None
                
                # AÑADIR ESTE BLOQUE: Crear y guardar el descuento
                descuento = Descuento(
                    tipo=data['descuento_tipo'],
                    valor=valor,
                    fecha_inicio=fecha_inicio,
                    fecha_fin=fecha_fin,
                    servicio_id=servicio.id
                )
                db.session.add(descuento)
                db.session.commit()

        return jsonify({'message': 'Servicio creado'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

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
        
        duracion_minutos = int(data['duracion'])
        horas = duracion_minutos // 60
        minutos = duracion_minutos % 60
        servicio.duracion = time(hour=horas, minute=minutos)

        if imagen:
            if servicio.imagen_url:
                public_id = servicio.imagen_url.split('/')[-1].split('.')[0]
                cloudinary.uploader.destroy(public_id)
            upload_result = cloudinary.uploader.upload(imagen)
            servicio.imagen_url = upload_result['secure_url']

        # Primero hacer commit de los cambios al servicio
        db.session.commit()

        # Manejar el descuento por separado
        if 'descuento_tipo' in data and data.get('descuento_valor'):
            valor = float(data['descuento_valor']) if data.get('descuento_valor') else 0
            if valor > 0:
                # Convertir fechas usando las funciones que ya hemos definido
                fecha_inicio_str = data.get('descuento_fecha_inicio')
                fecha_fin_str = data.get('descuento_fecha_fin')
                
                # Obtener fechas correctamente formateadas
                fecha_inicio = procesar_fecha(fecha_inicio_str) or date.today()
                fecha_fin = procesar_fecha(fecha_fin_str)
                
                # En lugar de usar SQL directo, vamos a usar el ORM
                if servicio.descuento:
                    # Actualizar descuento existente
                    servicio.descuento.tipo = data['descuento_tipo']
                    servicio.descuento.valor = valor
                    servicio.descuento.fecha_inicio = fecha_inicio
                    servicio.descuento.fecha_fin = fecha_fin
                else:
                    # Crear nuevo descuento
                    nuevo_descuento = Descuento(
                        tipo=data['descuento_tipo'],
                        valor=valor,
                        fecha_inicio=fecha_inicio,
                        fecha_fin=fecha_fin,
                        servicio_id=servicio.id
                    )
                    db.session.add(nuevo_descuento)
            else:
                # Si el valor es 0 o negativo, eliminar el descuento si existe
                if servicio.descuento:
                    db.session.delete(servicio.descuento)
        elif data.get('descuento_valor') == '':
            # Si el campo está vacío, eliminar el descuento si existe
            if servicio.descuento:
                db.session.delete(servicio.descuento)

        db.session.commit()
        return jsonify({'message': 'Servicio actualizado'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error al actualizar servicio: {str(e)}")
        return jsonify({'error': str(e)}), 400

@servicios_bp.route('/api/servicios/<int:id>', methods=['DELETE'])
def eliminar_servicio(id):
    if session.get('rol') != 'admin':
        return jsonify({'error': 'Acceso no autorizado'}), 403
    try:
        # Primero verificamos si hay citas que usan este servicio
        from app.models.cita import Cita
        citas = Cita.query.filter_by(servicio_id=id).all()
        
        if citas:
            # Si hay citas asociadas, no permitir la eliminación
            return jsonify({
                'error': f'No se puede eliminar el servicio porque está siendo utilizado en {len(citas)} cita(s). ' +
                        'Por favor, cambie el servicio de estas citas o elimínelas primero.'
            }), 400
        
        # Si no hay citas, primero eliminar el descuento si existe
        db.session.execute(text(f"DELETE FROM descuento WHERE servicio_id = {id}"))
        
        # Luego, buscamos el servicio
        servicio = Servicio.query.get_or_404(id)
        
        # Eliminar imagen si existe
        if servicio.imagen_url:
            try:
                public_id = servicio.imagen_url.split('/')[-1].split('.')[0]
                cloudinary.uploader.destroy(public_id)
            except Exception as e:
                print(f"Error al eliminar imagen de Cloudinary: {str(e)}")
        
        # Ahora eliminar el servicio
        db.session.delete(servicio)
        db.session.commit()
        return jsonify({'message': 'Servicio eliminado correctamente'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error al eliminar servicio: {str(e)}")
        return jsonify({'error': str(e)}), 400