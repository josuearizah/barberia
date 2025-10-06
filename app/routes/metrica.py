from flask import Blueprint, jsonify, request, session
from sqlalchemy import func, cast, Float
from app import db
from app.models.usuario import Usuario
from app.models.ingreso import Ingreso
from app.models.cita import Cita
from app.models.visita import VisitaPagina

ADMIN_ROLES = {Usuario.ROL_ADMIN, Usuario.ROL_SUPERADMIN}

metrica_bp = Blueprint('metrica', __name__)

@metrica_bp.route('/api/metrica/vista', methods=['POST'])
def registrar_vista():
    data = request.get_json(silent=True) or {}
    ruta = (data.get('ruta') or '/').strip()[:255] or '/'
    try:
        row = VisitaPagina.query.filter_by(ruta=ruta).first()
        if not row:
            row = VisitaPagina(ruta=ruta, contador=1)
            db.session.add(row)
        else:
            row.contador = (row.contador or 0) + 1
        db.session.commit()
        return jsonify({'ok': True, 'ruta': ruta, 'contador': int(row.contador)}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'error': str(e)}), 500

@metrica_bp.route('/api/metrica/dashboard', methods=['GET'])
def metrica_dashboard():
    try:
        total_clientes = db.session.query(func.count(Usuario.id))\
            .filter(func.lower(Usuario.rol) == 'cliente').scalar() or 0

        # Ingresos por barbero (aislado por cuenta)
        # Si hay un barbero autenticado (rol administrativo), filtramos SIEMPRE por su propio usuario_id.
        # Ignoramos cualquier barbero_id externo para evitar fugas de informaciÃ³n.
        barbero_id = session.get('usuario_id') if session.get('rol') in ADMIN_ROLES else None

        total_ingresos_q = db.session.query(func.coalesce(func.sum(cast(Ingreso.monto, Float)), 0.0))
        total_citas_completadas_q = db.session.query(func.count(Cita.id))

        if barbero_id is not None and session.get('rol') in ADMIN_ROLES:
            total_ingresos_q = total_ingresos_q.filter(Ingreso.barbero_id == barbero_id)
            total_citas_completadas_q = total_citas_completadas_q.filter(
                Cita.barbero_id == barbero_id,
                func.lower(Cita.estado) == 'completado'
            )
        else:
            # Si no hay barbero_id o no es admin, no exponemos datos de otros barberos.
            total_ingresos_q = total_ingresos_q.filter(False)
            total_citas_completadas_q = total_citas_completadas_q.filter(False)

        total_ingresos = float(total_ingresos_q.scalar() or 0.0)
        total_citas_completadas = int(total_citas_completadas_q.scalar() or 0)

        vistas_home = VisitaPagina.query.filter_by(ruta='/').first()
        total_vistas = int(vistas_home.contador) if vistas_home else 0

        return jsonify({
            'total_clientes': int(total_clientes),
            'total_ingresos': total_ingresos,
            'total_vistas': total_vistas,
            'total_citas_completadas': total_citas_completadas
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

