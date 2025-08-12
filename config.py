# config.py

class Config:
    #SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root@localhost:3306/login'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///flaskdb.sqlite'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CLOUDINARY_CLOUD_NAME = "dsi2yfaew"  # Reemplaza con tu cloud_name
    CLOUDINARY_API_KEY = "898169432537864"       # Reemplaza con tu api_key
    CLOUDINARY_API_SECRET = "kouHeUEf0wNqwGi-DOzLIph6nf0" # Reemplaza con tu api_secret
    SECURE = True