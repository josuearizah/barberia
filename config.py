import os


class Config:
    # Solo PostgreSQL (leer desde env). Ejemplo:
    # DATABASE_URL=postgresql+psycopg://user:pass@host:5432/dbname
    SQLALCHEMY_DATABASE_URI = os.environ.get('postgresql+psycopg://USER:PASS@HOST:5432/DBNAME')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CLOUDINARY_CLOUD_NAME = "dsi2yfaew"
    CLOUDINARY_API_KEY = "898169432537864"
    CLOUDINARY_API_SECRET = "kouHeUEf0wNqwGi-DOzLIph6nf0"
    SECURE = True

    if not SQLALCHEMY_DATABASE_URI:
        raise RuntimeError("DATABASE_URL no está definido. Configura la variable de entorno para PostgreSQL.")
    # Web Push deshabilitado
