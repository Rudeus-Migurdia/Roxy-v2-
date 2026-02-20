from __future__ import annotations

import asyncio
import sys
from pathlib import Path

from faster_whisper import WhisperModel


async def test_faster_whisper(audio_path: str | None = None) -> None:
    print("=== Faster Whisper Test ===")

    print("\n1. Testing import...")
    print("   OK: faster-whisper imported successfully")

    model_name = "large-v3"
    print(f"\n2. Loading model: {model_name} (this may take a while on first run)...")
    
    try:
        model = WhisperModel(model_name, device="cpu", compute_type="int8")
        print("   OK: Model loaded successfully")
    except Exception as e:
        print(f"   FAIL: {e}")
        return

    if audio_path:
        audio_file = Path(audio_path)
        if not audio_file.exists():
            print(f"\n   ERROR: Audio file not found: {audio_path}")
            return
        
        print(f"\n3. Transcribing: {audio_path}")
        print("   (This may take a while...)")
        
        try:
            segments, info = model.transcribe(str(audio_file), language=None)
            
            print(f"   Detected language: {info.language} (probability: {info.language_probability:.2f})")
            
            text = ""
            for segment in segments:
                text += segment.text
            
            print(f"   OK: Transcription complete")
            print(f"   Text: {text}")
        except Exception as e:
            print(f"   FAIL: {e}")
            return
    else:
        print("\n3. No audio file provided, skipping transcription test")
        print("   Usage: python test_asr.py /path/to/audio.wav")


if __name__ == "__main__":
    audio = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(test_faster_whisper(audio))
