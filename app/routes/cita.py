from flask import Blueprint, render_template, session, redirect, url_for, request, jsonify
from app.models.usuario import Usuario
from app.models.cita import Cita
from app.models.servicio import Servicio
from app.models.ingreso import Ingreso
from app import db
from datetime import datetime
from decimal import Decimal
import re

cita_bp = Blueprint('cita', __name__)

# Función auxiliar para calcular precio con descuento
def _precio_con_descuento(servicio, fecha_cita):
    """Calcula el precio final de un servicio aplicando descuento si existe y está vigente"""
    if not servicio:
        return Decimal('0.00')
    
    precio = Decimal(servicio.precio)
    descuento = getattr(servicio, 'descuento', None)
    
    if not descuento:
        return precio
    
    try:
        # Verificar vigencia del descuento respecto a la fecha de la cita
        if descuento.fecha_inicio and fecha_cita < descuento.fecha_inicio:
            return precio
        if descuento.fecha_fin and fecha_cita > descuento.fecha_fin:
            return precio
            
        # Aplicar descuento según tipo
        if descuento.tipo == 'porcentaje':
            porcentaje = Decimal(descuento.valor) / Decimal('100')
            return max(Decimal('0.00'), (precio * (Decimal('1.00') - porcentaje)).quantize(Decimal('0.01')))
        elif descuento.tipo == 'cantidad':
            return max(Decimal('0.00'), (precio - Decimal(descuento.valor)).quantize(Decimal('0.01')))
    except Exception as e:
        print(f"Error al calcular descuento: {str(e)}")
        return precio
        
    return precio

@cita_bp.route('/reservar_cita', methods=['GET', 'POST'])
def reservar_cita():
    # [código sin cambios]
    if 'usuario_id' not in session:
        return redirect(url_for('auth.login'))

    barberos = Usuario.query.filter_by(rol='admin').all()
    servicios = Servicio.query.order_by(Servicio.nombre.asc()).all()

    if request.method == 'POST' and len(servicios) == 0:
        return render_template('cita/reservar.html', barberos=barberos, servicios=servicios, exito=False, error_message='No hay servicios disponibles.')

    if request.method == 'POST':
        try:
            required_fields = ['date', 'time', 'service_id', 'barber']
            for field in required_fields:
                if field not in request.form or not request.form[field]:
                    raise ValueError(f"El campo {field} es requerido")

            fecha = datetime.strptime(request.form['date'], '%Y-%m-%d').date()

            barbero_id = int(request.form['barber'])
            barbero = Usuario.query.filter_by(id=barbero_id, rol='admin').first()
            if not barbero:
                raise ValueError("El barbero seleccionado no es válido")

            servicio_id = int(request.form['service_id'])
            servicio = Servicio.query.get(servicio_id)
            if not servicio:
                raise ValueError("El servicio seleccionado no existe")

            # Verificar si hay un segundo servicio
            segundo_servicio_id = request.form.get('second_service_id')
            segundo_servicio = None
            if segundo_servicio_id:
                segundo_servicio = Servicio.query.get(int(segundo_servicio_id))
                if not segundo_servicio:
                    raise ValueError("El servicio adicional seleccionado no existe")

            usuario_actual = Usuario.query.get(session['usuario_id'])
            full_name_db = f"{(usuario_actual.nombre or '').strip()} {(usuario_actual.apellido or '').strip()}".strip().lower()

            nombre_cliente = (request.form.get('name') or request.form.get('nombre') or '').strip()
            telefono_cliente = (request.form.get('phone') or request.form.get('telefono') or '').strip()

            def norm_phone(p): return re.sub(r'\D', '', p or '')
            same_name = bool(nombre_cliente) and nombre_cliente.lower() == full_name_db
            same_phone = bool(telefono_cliente and usuario_actual.telefono) and norm_phone(telefono_cliente) == norm_phone(usuario_actual.telefono)

            if same_name or same_phone:
                nombre_cliente = None
                telefono_cliente = None

            # Crear la cita con el servicio principal
            cita = Cita(
                fecha_cita=fecha,
                hora=request.form['time'],
                notas=request.form.get('notes', ''),
                usuario_id=session['usuario_id'],
                barbero_id=barbero_id,
                servicio_id=servicio_id,
                nombre_cliente=nombre_cliente or None,
                telefono_cliente=telefono_cliente or None,
                servicio_adicional_id=segundo_servicio.id if segundo_servicio else None
            )
            
            db.session.add(cita)
            db.session.commit()
            return render_template('cita/reservar.html', barberos=barberos, servicios=servicios, exito=True)

        except Exception as e:
            db.session.rollback()
            error_message = f"Error al registrar la cita: {str(e)}"
            return render_template('cita/reservar.html', barberos=barberos, servicios=servicios, exito=False, error_message=error_message)

    return render_template('cita/reservar.html', barberos=barberos, servicios=servicios)


@cita_bp.route('/api/citas', methods=['GET'])
def obtener_citas():
    try:
        usuario_id = session.get('usuario_id')
        if not usuario_id:
            return jsonify({'error': 'No autorizado'}), 401
        usuario = Usuario.query.get(usuario_id)
        if usuario.rol == 'admin':
            # Barbero: solo sus citas
            citas = Cita.query.filter_by(barbero_id=usuario_id).all()
        else:
            # Cliente: solo sus citas
            citas = Cita.query.filter_by(usuario_id=usuario_id).all()
        return jsonify([{
            'id': cita.id,
            'barbero_id': cita.barbero_id,
            'barbero_nombre': cita.barbero.nombre if cita.barbero else None,
            'barbero_apellido': cita.barbero.apellido if cita.barbero else None,
            'usuario_id': cita.usuario_id,
            'usuario_nombre': cita.usuario.nombre if cita.usuario else '',
            'usuario_apellido': cita.usuario.apellido if cita.usuario else '',
            'usuario_telefono': cita.usuario.telefono if cita.usuario else None,
            'nombre_cliente': cita.nombre_cliente if cita.nombre_cliente else None,
            'telefono_cliente': cita.telefono_cliente if cita.telefono_cliente else None,
            'fecha_creacion': cita.fecha_creacion.strftime('%Y-%m-%d'),
            'fecha_cita': cita.fecha_cita.strftime('%Y-%m-%d'),
            'hora': cita.hora,
            'hora_12h': cita.hora_12h(),
            'servicio_id': cita.servicio_id,
            'servicio_nombre': cita.servicio.nombre if cita.servicio else None,
            'servicio_adicional_id': cita.servicio_adicional_id,
            'servicio_adicional_nombre': cita.servicio_adicional.nombre if cita.servicio_adicional else None,
            'notas': cita.notas,
            'estado': cita.estado
        } for cita in citas]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@cita_bp.route('/api/citas/<int:cita_id>', methods=['PUT'])
def actualizar_cita(cita_id):
    # [código sin cambios]
    try:
        cita = Cita.query.get_or_404(cita_id)
        if cita.usuario_id != session.get('usuario_id'):
            return jsonify({'error': 'No tienes permiso para modificar esta cita'}), 403
        form_data = request.form
        cita.barbero_id = int(form_data.get('barbero'))
        cita.fecha_cita = datetime.strptime(form_data.get('fecha_cita'), '%Y-%m-%d').date()
        cita.hora = form_data.get('hora')
        cita.servicio_id = int(form_data.get('servicio')) if form_data.get('servicio') else None
        cita.notas = form_data.get('notas')
        db.session.commit()
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@cita_bp.route('/api/citas/<int:cita_id>', methods=['DELETE'])
def eliminar_cita(cita_id):
    # [código sin cambios]
    try:
        cita = Cita.query.get_or_404(cita_id)
        if cita.usuario_id != session.get('usuario_id'):
            return jsonify({'error': 'No tienes permiso para eliminar esta cita'}), 403
        db.session.delete(cita)
        db.session.commit()
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@cita_bp.route('/api/barberos', methods=['GET'])
def obtener_barberos():
    # [código sin cambios]
    try:
        barberos = Usuario.query.filter_by(rol='admin').all()
        return jsonify([{
            'id': b.id,
            'nombre': b.nombre,
            'apellido': b.apellido
        } for b in barberos]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@cita_bp.route('/api/citas/<int:cita_id>/estado', methods=['POST'])
def actualizar_estado_cita(cita_id):
    try:
        if 'usuario_id' not in session:
            return jsonify({'error': 'No autorizado'}), 403
        
        data = request.get_json()
        if not data or 'estado' not in data:
            return jsonify({'error': 'Datos incompletos'}), 400
        
        nuevo_estado = data['estado']
        if nuevo_estado not in ['pendiente', 'confirmado', 'cancelado', 'completado']:
            return jsonify({'error': 'Estado no válido'}), 400
        
        cita = Cita.query.get(cita_id)
        if not cita:
            return jsonify({'error': 'Cita no encontrada'}), 404
        
        # Verificar permisos y validaciones
        usuario_id = session['usuario_id']
        if session.get('rol') != 'admin' and cita.usuario_id != usuario_id:
            return jsonify({'error': 'No autorizado para modificar esta cita'}), 403
        
        if cita.estado == 'completado' and nuevo_estado != 'completado':
            return jsonify({'error': 'No se puede modificar una cita ya completada'}), 400
        
        estado_anterior = cita.estado
        cita.estado = nuevo_estado
        
        # Si se completa la cita, registrar en historial y crear ingresos
        if nuevo_estado == 'completado' and estado_anterior != 'completado':
            from app.models.historial import HistorialCita
            from app.models.ingreso import Ingreso
            from app.models.servicio import Servicio
            
            # 1. Crear entrada en el historial
            historial = HistorialCita(
                cita_id=cita.id,
                fecha_cita=cita.fecha_cita,
                hora=cita.hora,
                usuario_id=cita.usuario_id,
                barbero_id=cita.barbero_id,
                servicio_id=cita.servicio_id,
                servicio_adicional_id=cita.servicio_adicional_id,
                nombre_cliente=cita.nombre_cliente,
                notas=cita.notas
            )
            db.session.add(historial)
            
            # 2. Crear un ingreso para el servicio principal CON DESCUENTO
            servicio_principal = Servicio.query.get(cita.servicio_id)
            if servicio_principal:
                # Calcular precio con descuento para servicio principal
                monto_principal = _precio_con_descuento(servicio_principal, cita.fecha_cita)
                
                ingreso_principal = Ingreso(
                    monto=monto_principal,  # Usar precio con descuento
                    cita_id=cita.id,
                    barbero_id=cita.barbero_id,
                    servicio_id=cita.servicio_id,
                    descripcion=f"Ingreso por {servicio_principal.nombre}"
                )
                db.session.add(ingreso_principal)
            
            # 3. Crear un ingreso para el servicio adicional CON DESCUENTO
            if cita.servicio_adicional_id:
                servicio_adicional = Servicio.query.get(cita.servicio_adicional_id)
                if servicio_adicional:
                    # Calcular precio con descuento para servicio adicional
                    monto_adicional = _precio_con_descuento(servicio_adicional, cita.fecha_cita)
                    
                    ingreso_adicional = Ingreso(
                        monto=monto_adicional,  # Usar precio con descuento
                        cita_id=cita.id,
                        barbero_id=cita.barbero_id,
                        servicio_id=cita.servicio_adicional_id,
                        descripcion=f"Ingreso adicional por {servicio_adicional.nombre}"
                    )
                    db.session.add(ingreso_adicional)
        
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'mensaje': f'Estado actualizado a: {nuevo_estado}',
            'cita': {
                'id': cita.id,
                'estado': cita.estado
            }
        })
        
    except Exception as e:
        db.session.rollback()
        import traceback
        print("Error en actualizar_estado_cita:", str(e))
        print(traceback.format_exc())
        return jsonify({'error': f'Error al actualizar estado: {str(e)}'}), 500
