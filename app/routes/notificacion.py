from flask import Blueprint, request, jsonify, session, Response, stream_with_context, render_template, current_app
from datetime import datetime
from time import sleep, monotonic
from sqlalchemy import func, case
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

    def _fetch_snapshot():
        unread_expr = func.coalesce(func.sum(case((Notificacion.leida.is_(False), 1), else_=0)), 0)
        stats = db.session.query(
            unread_expr.label('unread_count'),
            func.max(Notificacion.id),
            func.max(func.coalesce(Notificacion.leida_en, Notificacion.creada_en)),
            func.max(Notificacion.creada_en)
        ).filter(Notificacion.usuario_id == uid).one()

        unread_count, latest_id, last_activity, latest_created = stats
        return {
            'count': int(unread_count or 0),
            'latest_id': int(latest_id or 0),
            'last_activity': last_activity.isoformat() if last_activity else None,
            'latest_created': latest_created.isoformat() if latest_created else None
        }

    def event_stream():
        last_payload = None
        last_heartbeat = monotonic()
        check_interval = 2
        heartbeat_interval = 15

        try:
            payload = _fetch_snapshot()
        except Exception as exc:
            current_app.logger.exception('Error obteniendo snapshot inicial de notificaciones', exc_info=exc)
            return

        try:
            yield f"retry: 5000\nid: {payload['latest_id']}\nevent: update\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"
            last_payload = payload
            last_heartbeat = monotonic()

            while True:
                sleep(check_interval)
                try:
                    payload = _fetch_snapshot()
                    if payload != last_payload:
                        yield f"id: {payload['latest_id']}\nevent: update\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"
                        last_payload = payload
                        last_heartbeat = monotonic()
                    elif monotonic() - last_heartbeat >= heartbeat_interval:
                        yield f": heartbeat {datetime.utcnow().isoformat()}\n\n"
                        last_heartbeat = monotonic()
                except GeneratorExit:
                    break
                except Exception as exc:
                    current_app.logger.exception('Error transmitiendo notificaciones SSE', exc_info=exc)
                    break
        finally:
            db.session.remove()

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
