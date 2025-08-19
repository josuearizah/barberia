from app import db

class Estilo(db.Model):
    __tablename__ = 'estilo'

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), nullable=False)
    categoria = db.Column(db.String(50), nullable=False)         # libre: corte, barba, lineas, disenos u otra futura
    imagen_url = db.Column(db.String(255), nullable=True)
    activo = db.Column(db.Boolean, nullable=False, default=True)

    __table_args__ = (
        db.UniqueConstraint('categoria', 'nombre', name='uq_estilo_categoria_nombre'),
        db.Index('ix_estilo_categoria', 'categoria'),
    )

    def __repr__(self):
        return self.nombre