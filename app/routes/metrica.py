from flask import Blueprint, jsonify, request
from sqlalchemy import func, cast, Float
from app import db
from app.models.usuario import Usuario
from app.models.ingreso import Ingreso
from app.models.visita import VisitaPagina

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

        # Cast por seguridad si monto no es estrictamente numérico en el motor
        total_ingresos = db.session.query(func.coalesce(func.sum(cast(Ingreso.monto, Float)), 0.0)).scalar() or 0.0

        vistas_home = VisitaPagina.query.filter_by(ruta='/').first()
        total_vistas = int(vistas_home.contador) if vistas_home else 0

        return jsonify({
            'total_clientes': int(total_clientes),
            'total_ingresos': float(total_ingresos),
            'total_vistas': total_vistas
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500