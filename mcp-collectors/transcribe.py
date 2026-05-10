import whisper
import os
import uuid

def process_audio(file_path: str) -> str:
    # Use the base/tiny model for fast local transcription without heavy GPU needs
    model = whisper.load_model("tiny.en")
    result = model.transcribe(file_path)
    return result["text"]
