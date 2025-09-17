import os


class Config:
    # Solo PostgreSQL (leer desde env). Ejemplo:
    # DATABASE_URL=postgresql+psycopg://user:pass@host:5432/dbname
    print("Configurando la base de datos...", flush=True)
    print("DATABASE_URL:", os.environ.get('DATABASE_URL'), flush=True)

    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CLOUDINARY_CLOUD_NAME = "drs5tsewg"
    CLOUDINARY_API_KEY = "521191768325431"
    CLOUDINARY_API_SECRET = "dj84XVN8leEKRlfUNNDHNGN85dM"
    SECURE = True

    if not SQLALCHEMY_DATABASE_URI:
        raise RuntimeError("DATABASE_URL no está definido. Configura la variable de entorno para PostgreSQL.")
    # Web Push deshabilitado

