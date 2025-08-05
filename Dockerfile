# Usa una imagen base de Python
FROM python:3.11-slim

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia todos los archivos del proyecto al contenedor
COPY . .

# Instala las dependencias del proyecto
RUN pip install --no-cache-dir -r requirements.txt

# Expón el puerto en el que correrá la app Flask
EXPOSE 8080

# Establece el entorno en producción (opcional)
ENV FLASK_ENV=production

# Comando para ejecutar tu aplicación
CMD ["python", "run.py"]
