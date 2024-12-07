from flask_socketio import SocketIO

socketio = SocketIO(cors_allowed_origins="*", max_http_buffer_size=16 * 1024 * 1024, async_mode='eventlet')

def init_socketio(app):
    socketio.init_app(app)
