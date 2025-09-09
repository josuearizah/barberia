from flask import Blueprint, request, jsonify, session, Response, stream_with_context, render_template, current_app, send_from_directory
from datetime import datetime
from time import sleep
from app import db
from app.models.notificacion import Notificacion
from app.models.push_subscription import PushSubscription
import json

try:
    from pywebpush import webpush, WebPushException
except Exception:
    webpush = None
    WebPushException = Exception

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


# ------- Web Push: Service Worker & Public Key -------

@notificacion_bp.route('/sw.js')
def service_worker():
    # servir sw.js desde static/js pero con scope en '/'
    return send_from_directory('static/js', 'sw.js', mimetype='application/javascript')


@notificacion_bp.route('/api/push/public_key', methods=['GET'])
def push_public_key():
    key = current_app.config.get('VAPID_PUBLIC_KEY')
    if not key:
        return jsonify({'error': 'VAPID public key not configured'}), 500
    return jsonify({'key': key})


@notificacion_bp.route('/api/push/subscribe', methods=['POST'])
def push_subscribe():
    uid = _require_login()
    if not uid:
        return jsonify({'error': 'No autenticado'}), 401
    data = request.get_json(force=True) or {}
    sub = data.get('subscription') or {}
    endpoint = sub.get('endpoint')
    keys = sub.get('keys') or {}
    p256dh = keys.get('p256dh')
    auth = keys.get('auth')
    if not endpoint or not p256dh or not auth:
        return jsonify({'error': 'Suscripción inválida'}), 400
    existing = PushSubscription.query.filter_by(endpoint=endpoint).first()
    if existing:
        existing.usuario_id = uid
        existing.p256dh = p256dh
        existing.auth = auth
    else:
        s = PushSubscription(usuario_id=uid, endpoint=endpoint, p256dh=p256dh, auth=auth)
        db.session.add(s)
    db.session.commit()
    return jsonify({'success': True})


@notificacion_bp.route('/api/push/unsubscribe', methods=['POST'])
def push_unsubscribe():
    uid = _require_login()
    if not uid:
        return jsonify({'error': 'No autenticado'}), 401
    data = request.get_json(force=True) or {}
    endpoint = (data.get('endpoint') or '').strip()
    if not endpoint:
        return jsonify({'error': 'endpoint requerido'}), 400
    PushSubscription.query.filter_by(endpoint=endpoint, usuario_id=uid).delete()
    db.session.commit()
    return jsonify({'success': True})


def send_push_to_user(user_id: int, title: str, body: str, url: str = '/notificaciones', icon: str = None, extra: dict = None):
    """Envía Web Push a todas las suscripciones del usuario (si hay VAPID + pywebpush)."""
    if webpush is None:
        # pywebpush no instalado
        return False
    vapid_private = current_app.config.get('VAPID_PRIVATE_KEY')
    vapid_public = current_app.config.get('VAPID_PUBLIC_KEY')
    vapid_subject = current_app.config.get('VAPID_SUBJECT') or 'mailto:admin@example.com'
    if not vapid_private or not vapid_public:
        return False
    subs = PushSubscription.query.filter_by(usuario_id=user_id).all()
    if not subs:
        return False
    payload = {
        'title': title,
        'body': body,
        'url': url,
        'icon': icon or '/static/img/logo2.png',
        'data': extra or {}
    }
    vapid_claims = {
        'sub': vapid_subject
    }
    for s in subs:
        try:
            webpush(
                subscription_info=s.to_webpush(),
                data=json.dumps(payload),
                vapid_private_key=vapid_private,
                vapid_claims=vapid_claims,
                vapid_public_key=vapid_public,
            )
        except WebPushException as e:
            # Si la suscripción es inválida, eliminarla
            status = getattr(e, 'response', None)
            try:
                if status is not None and status.status_code in (404, 410):
                    db.session.delete(s)
                    db.session.commit()
            except Exception:
                pass
    return True


@notificacion_bp.route('/api/push/test', methods=['POST'])
def push_test():
    uid = _require_login()
    if not uid:
        return jsonify({'error': 'No autenticado'}), 401
    ok = send_push_to_user(uid, 'Prueba de notificación', 'Este es un mensaje de prueba.', url='/notificaciones')
    return jsonify({'success': ok})

