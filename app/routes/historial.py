from flask import Blueprint, render_template, jsonify, session, request, redirect, url_for
from app.models.historial import HistorialCita
from app.models.usuario import Usuario
from app.models.cita import Cita
from app import db
from datetime import datetime, timedelta
import json

historial_bp = Blueprint('historial', __name__)

@historial_bp.route('/admin/historial')
def admin_historial():
    """Página de historial para administradores"""
    if 'usuario_id' not in session or session.get('rol') != 'admin':
        return redirect(url_for('auth.login'))
    
    return render_template('usuario/admin/historial.html')

@historial_bp.route('/historial')
def cliente_historial():
    """Página de historial para clientes"""
    if 'usuario_id' not in session:
        return redirect(url_for('auth.login'))
    
    return render_template('usuario/cliente/historial.html')

# ...existing code...

@historial_bp.route('/api/historial', methods=['GET'])
def obtener_historial():
    """API para obtener historial de citas"""
    if 'usuario_id' not in session:
        return jsonify({'error': 'No autorizado'}), 403
    
    try:
        usuario_id = session['usuario_id']
        usuario = Usuario.query.get(usuario_id)
        
        # Construir la consulta base para la tabla de historial
        query = HistorialCita.query
        
        if usuario.rol == 'admin':
            # Para admins, mostrar solo sus propias citas como barbero
            query = query.filter_by(barbero_id=usuario_id)
        else:
            # Para clientes, mostrar solo sus propias citas
            query = query.filter_by(usuario_id=usuario_id)
        
        # Ordenar por fecha de cita (más reciente primero)
        historial = query.order_by(HistorialCita.fecha_cita.desc(), HistorialCita.hora.desc()).all()
        
        # Si no hay resultados en el historial y el usuario es un cliente, 
        # verificar si hay citas completadas que aún no están en el historial
        if len(historial) == 0 and usuario.rol != 'admin':
            # Buscar citas completadas del usuario que no estén en el historial
            citas_completadas = Cita.query.filter_by(
                usuario_id=usuario_id,
                estado='completado'
            ).all()
            
            # Crear entradas en el historial para estas citas
            for cita in citas_completadas:
                nuevo_historial = HistorialCita(
                    cita_id=cita.id,
                    fecha_cita=cita.fecha_cita,
                    hora=cita.hora,
                    usuario_id=cita.usuario_id,
                    barbero_id=cita.barbero_id,
                    servicio_id=cita.servicio_id,
                    servicio_adicional_id=cita.servicio_adicional_id,  # Incluir servicio adicional
                    nombre_cliente=cita.nombre_cliente,
                    notas=cita.notas
                )
                db.session.add(nuevo_historial)
            
            if citas_completadas:
                db.session.commit()
                # Volver a consultar el historial después de añadir las citas
                historial = query.order_by(HistorialCita.fecha_cita.desc(), HistorialCita.hora.desc()).all()
        
        # Igual para administradores, buscar citas completadas que no estén en historial
        if len(historial) == 0 and usuario.rol == 'admin':
            # Buscar citas completadas donde el usuario es el barbero
            citas_completadas = Cita.query.filter_by(
                barbero_id=usuario_id,
                estado='completado'
            ).all()
            
            # Crear entradas en el historial para estas citas
            for cita in citas_completadas:
                nuevo_historial = HistorialCita(
                    cita_id=cita.id,
                    fecha_cita=cita.fecha_cita,
                    hora=cita.hora,
                    usuario_id=cita.usuario_id,
                    barbero_id=cita.barbero_id,
                    servicio_id=cita.servicio_id,
                    servicio_adicional_id=cita.servicio_adicional_id,  # Incluir servicio adicional
                    nombre_cliente=cita.nombre_cliente,
                    notas=cita.notas
                )
                db.session.add(nuevo_historial)
            
            if citas_completadas:
                db.session.commit()
                # Volver a consultar el historial después de añadir las citas
                historial = query.order_by(HistorialCita.fecha_cita.desc(), HistorialCita.hora.desc()).all()
        
        # Preparar resultados para la respuesta
        resultado = []
        
        for h in historial:
            # Obtener datos del servicio
            servicio_nombre = None
            if h.servicio:
                servicio_nombre = h.servicio.nombre
                
            # Obtener datos del servicio adicional
            servicio_adicional_nombre = None
            if h.servicio_adicional:
                servicio_adicional_nombre = h.servicio_adicional.nombre
            
            # Convertir hora a formato 12h
            hora_12h = h.hora_12h() if hasattr(h, 'hora_12h') else h.hora
            
            # Ajustar fecha_completado a hora de Colombia (UTC-5)
            fecha_completado_utc = h.fecha_completado
            # Restar 5 horas para obtener hora de Colombia
            fecha_completado_col = fecha_completado_utc - timedelta(hours=5)
            
            # Función para convertir a formato AM/PM
            def formato_12h(hora):
                hora_12 = hora.hour % 12
                if hora_12 == 0:
                    hora_12 = 12
                ampm = "AM" if hora.hour < 12 else "PM"
                return f"{hora_12:02d}:{hora.minute:02d} {ampm}"
            
            # Formatear fecha completado
            fecha_completado_formato = f"{fecha_completado_col.day:02d}/{fecha_completado_col.month:02d}/{fecha_completado_col.year} {formato_12h(fecha_completado_col)}"
            
            # Añadir al resultado
            resultado.append({
                'id': h.id,
                'fecha_cita': h.fecha_cita.strftime('%Y-%m-%d'),
                'fecha_cita_formato': h.fecha_cita.strftime('%d/%m/%Y'),
                'hora': h.hora,
                'hora_12h': hora_12h,
                'fecha_completado': fecha_completado_col.strftime('%Y-%m-%d %H:%M:%S'),
                'fecha_completado_formato': fecha_completado_formato,
                'usuario_id': h.usuario_id,
                'usuario_nombre': h.usuario.nombre if h.usuario else None,
                'usuario_apellido': h.usuario.apellido if h.usuario else None,
                'barbero_id': h.barbero_id,
                'barbero_nombre': h.barbero.nombre if h.barbero else None,
                'barbero_apellido': h.barbero.apellido if h.barbero else None,
                'servicio_id': h.servicio_id,
                'servicio_nombre': servicio_nombre,
                'servicio_adicional_id': h.servicio_adicional_id,
                'servicio_adicional_nombre': servicio_adicional_nombre,
                'nombre_cliente': h.nombre_cliente,
                'notas': h.notas
            })
        
        return jsonify(resultado)
    
    except Exception as e:
        import traceback
        print("Error en obtener_historial:", e)
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500