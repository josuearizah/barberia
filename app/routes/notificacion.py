from flask import Blueprint, request, jsonify, session, Response, stream_with_context, render_template
from datetime import datetime
from time import sleep
from app import db
from app.models.notificacion import Notificacion
import json

notificacion_bp = Blueprint('notificacion', __name__)


def _require_login():
    uid = session.get('usuario_id')
    if not uid:
        return None
    return uid


@notificacion_bp.route('/api/notificaciones', methods=['GET'])
def listar_notificaciones():
    uid = _require_login()
    if not uid:
        return jsonify({'error': 'No autenticado'}), 401

    unread = request.args.get('unread')
    limit = min(int(request.args.get('limit', 20)), 100)

    q = Notificacion.query.filter_by(usuario_id=uid).order_by(Notificacion.creada_en.desc())
    if unread in ('1', 'true', 'True'):
        q = q.filter_by(leida=False)

    items = q.limit(limit).all()
    return jsonify([n.to_dict() for n in items])


@notificacion_bp.route('/api/notificaciones/unread_count', methods=['GET'])
def contar_no_leidas():
    uid = _require_login()
    if not uid:
        return jsonify({'error': 'No autenticado'}), 401
    count = Notificacion.query.filter_by(usuario_id=uid, leida=False).count()
    return jsonify({'count': count})


@notificacion_bp.route('/api/notificaciones/<int:notif_id>/leida', methods=['POST'])
def marcar_leida(notif_id):
    uid = _require_login()
    if not uid:
        return jsonify({'error': 'No autenticado'}), 401
    n = Notificacion.query.filter_by(id=notif_id, usuario_id=uid).first()
    if not n:
        return jsonify({'error': 'No encontrada'}), 404
    if not n.leida:
        n.leida = True
        n.leida_en = datetime.utcnow()
        db.session.commit()
    return jsonify({'success': True})


@notificacion_bp.route('/api/notificaciones/leidas_todas', methods=['POST'])
def marcar_todas_leidas():
    uid = _require_login()
    if not uid:
        return jsonify({'error': 'No autenticado'}), 401
    Notificacion.query.filter_by(usuario_id=uid, leida=False).update({
        Notificacion.leida: True,
        Notificacion.leida_en: datetime.utcnow()
    })
    db.session.commit()
    return jsonify({'success': True})


@notificacion_bp.route('/api/notificaciones/sse')
def sse_notificaciones():
    uid = _require_login()
    if not uid:
        return jsonify({'error': 'No autenticado'}), 401

    def event_stream():
        # Envío inicial
        count = Notificacion.query.filter_by(usuario_id=uid, leida=False).count()
        yield f"event: init\ndata: {{\"count\": {count}}}\n\n"
        # Mantener viva la conexión y enviar conteo cada 20s
        while True:
            sleep(20)
            try:
                count = Notificacion.query.filter_by(usuario_id=uid, leida=False).count()
                yield f"event: tick\ndata: {{\"count\": {count}}}\n\n"
            except Exception:
                break

    headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
        'Connection': 'keep-alive'
    }
    return Response(stream_with_context(event_stream()), headers=headers)


@notificacion_bp.route('/notificaciones')
def pagina_notificaciones():
    uid = _require_login()
    if not uid:
        return render_template('login.html')
    return render_template('usuario/notificaciones.html')


# (Eliminado Web Push) Solo in-app + SSE
