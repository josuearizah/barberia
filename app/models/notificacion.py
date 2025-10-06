from datetime import datetime
from flask import current_app
from app import db


class Notificacion(db.Model):
    __tablename__ = 'notificacion'

    @staticmethod
    def _fix_mojibake(value):
        if value is None:
            return value
        if isinstance(value, str):
            if any(marker in value for marker in ('Ã', 'â', 'Â', '�')):
                try:
                    return value.encode('latin-1').decode('utf-8')
                except (UnicodeEncodeError, UnicodeDecodeError):
                    return value
            return value
        if isinstance(value, dict):
            return {k: Notificacion._fix_mojibake(v) for k, v in value.items()}
        if isinstance(value, list):
            return [Notificacion._fix_mojibake(item) for item in value]
        if isinstance(value, tuple):
            return tuple(Notificacion._fix_mojibake(item) for item in value)
        return value


    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False, index=True)
    titulo = db.Column(db.String(200), nullable=False)
    mensaje = db.Column(db.Text, nullable=True)
    tipo = db.Column(db.String(50), nullable=True)  # info, cita, pago, alerta
    prioridad = db.Column(db.String(20), nullable=True)  # baja, media, alta
    data = db.Column(db.JSON, nullable=True)  # datos adicionales, e.g. {"url":"/citas/123"}
    leida = db.Column(db.Boolean, default=False, index=True)
    creada_en = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    leida_en = db.Column(db.DateTime, nullable=True)
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if hasattr(self, 'titulo'):
            self.titulo = self._fix_mojibake(self.titulo)
        if hasattr(self, 'mensaje'):
            self.mensaje = self._fix_mojibake(self.mensaje)
        if hasattr(self, 'tipo'):
            self.tipo = self._fix_mojibake(self.tipo)
        if hasattr(self, 'prioridad'):
            self.prioridad = self._fix_mojibake(self.prioridad)
        if hasattr(self, 'data') and isinstance(self.data, (dict, list, tuple)):
            self.data = self._fix_mojibake(self.data)


    def to_dict(self):
        data = self._fix_mojibake(self.data or {})
        return {
            'id': self.id,
            'usuario_id': self.usuario_id,
            'titulo': self._fix_mojibake(self.titulo),
            'mensaje': self._fix_mojibake(self.mensaje),
            'tipo': self._fix_mojibake(self.tipo),
            'prioridad': self._fix_mojibake(self.prioridad),
            'data': data,
            'leida': self.leida,
            'creada_en': self.creada_en.isoformat() if self.creada_en else None,
            'leida_en': self.leida_en.isoformat() if self.leida_en else None,
        }

