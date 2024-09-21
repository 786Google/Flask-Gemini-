import os
from flask import Flask, render_template
from flask_socketio import SocketIO
from dotenv import load_dotenv
import google.generativeai as genai
import eventlet

# Load environment variables from .env file
load_dotenv()

# Create Flask application instance
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'YOUR_SECRET_KEY')  # Replace with a strong secret key

# Initialize SocketIO with eventlet as the async mode
socketio = SocketIO(app, async_mode='eventlet')

# Configure Google Generative AI
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
model = genai.GenerativeModel(model_name="gemini-pro")
chat_session = model.start_chat()

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('message')
def handle_message(data):
    user_message = data.get('message')
    temperature = float(data.get('temperature', 1))
    top_p = float(data.get('top_p', 0.95))
    top_k = int(data.get('top_k', 64))
    max_output_tokens = int(data.get('max_output_tokens', 8192))

    generation_config = {
        "temperature": temperature,
        "top_p": top_p,
        "top_k": top_k,
        "max_output_tokens": max_output_tokens,
        "response_mime_type": "text/plain",
    }
    chat_session.generation_config = generation_config

    response = chat_session.send_message(user_message, stream=True)

    for chunk in response:
        socketio.emit('response', {'chunk': chunk.text})

    socketio.emit('response', {'complete': True})

if __name__ == '__main__':
    # Run the app using SocketIO
    socketio.run(app, debug=True)

