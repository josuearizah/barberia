from app import create_app, db
import os

app = create_app()

# Fuerza el modo debug explícitamente
app.debug = False

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)), debug=False)