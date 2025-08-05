# Usa una imagen base oficial de Python
FROM python:3.11-slim

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia todos los archivos del proyecto al contenedor
COPY . .

# Instala dependencias desde requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Expone el puerto (Flask corre por defecto en el 5000)
EXPOSE 5000

# Define la variable de entorno para Flask
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0

# Comando que ejecuta tu app Flask
CMD ["flask", "run"]
