from app import db

class Perfil(db.Model):
    __tablename__ = 'perfil'

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), unique=True, nullable=False)
    imagen = db.Column(db.String(255), nullable=True)          # URL de la foto de perfil
    descripcion = db.Column(db.Text, nullable=True)
    redes_sociales = db.Column(db.Text, nullable=True)         # JSON string
    usuario = db.relationship('Usuario', backref=db.backref('perfil', uselist=False))

    def __repr__(self):
        return f'<Perfil {self.id} de usuario {self.usuario_id}>'