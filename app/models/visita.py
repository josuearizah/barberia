from app import db
from datetime import datetime

class VisitaPagina(db.Model):
    __tablename__ = 'visita_pagina'
    id = db.Column(db.Integer, primary_key=True)
    ruta = db.Column(db.String(255), unique=True, nullable=False, index=True)
    contador = db.Column(db.Integer, nullable=False, default=0)
    actualizado_en = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<VisitaPagina {self.ruta}={self.contador}>'