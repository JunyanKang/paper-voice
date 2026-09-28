"""Offline Paper Voice JSON-lines worker. Text/audio never leave this process.
Each response is one JSON line; WAV payloads are inline to avoid shared-file races.
"""
import base64
import contextlib
import io
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import time

VOICES = {'af_heart', 'af_bella', 'am_michael', 'am_fenrir', 'bf_emma', 'bm_george'}

def reply(value):
    print(json.dumps(value, ensure_ascii=True), flush=True)

def validate(request):
    if not isinstance(request, dict):
        raise ValueError('Request must be an object')
    text = request.get('text')
    if not isinstance(text, str) or not text.strip() or len(text) > 1600:
        raise ValueError('Text must contain 1–1600 characters')
    voice = request.get('voice')
    if voice not in VOICES:
        raise ValueError('Unknown voice')
    rate = request.get('rate', 1)
    if isinstance(rate, bool) or not isinstance(rate, (int, float)) or not 0.6 <= rate <= 1.6:
        raise ValueError('Rate must be between 0.6 and 1.6')
    return text, voice, float(rate)

def main():
    # Limit CPU use on the reader's host. No network clients or download paths are used.
    os.environ['OMP_NUM_THREADS'] = '4'
    os.environ['ORT_NUM_THREADS'] = '4'
    from kokoro_onnx import Kokoro
    from kokoro_onnx.config import EspeakConfig
    import espeakng_loader
    import soundfile as sf
    root = Path(__file__).resolve().parent
    # eSpeak resolves paths and has a native path length limit; copy data to a short private path.
    with tempfile.TemporaryDirectory(prefix='paper-voice-', dir='/private/tmp' if sys.platform=='darwin' else None) as folder:
        data = Path(folder) / 'data'
        shutil.copytree(espeakng_loader.get_data_path(), data)
        config = EspeakConfig(lib_path=espeakng_loader.get_library_path(), data_path=str(data))
        os.environ['ESPEAK_DATA_PATH'] = str(data)
        with contextlib.redirect_stdout(sys.stderr):
            engine = Kokoro(str(root / 'models/kokoro-v1.0.onnx'), str(root / 'models/voices-v1.0.bin'), espeak_config=config)
        reply({'ready': True, 'version': '1.0.0', 'voices': sorted(VOICES)})
        for line in sys.stdin:
            request = {}
            try:
                if len(line) > 16000:
                    raise ValueError('Request too large')
                request = json.loads(line)
                text, voice, rate = validate(request)
                start = time.monotonic()
                with contextlib.redirect_stdout(sys.stderr):
                    samples, sr = engine.create(text, voice=voice, speed=rate,
                                                lang='en-gb' if voice.startswith('b') else 'en-us')
                buffer = io.BytesIO()
                sf.write(buffer, samples, sr, format='WAV', subtype='PCM_16')
                reply({'id': request.get('id'), 'ok': True, 'audio': base64.b64encode(buffer.getvalue()).decode(),
                       'duration': len(samples) / sr, 'seconds': round(time.monotonic() - start, 3)})
            except Exception as exc:
                reply({'id': request.get('id') if isinstance(request, dict) else None, 'ok': False, 'error': str(exc)[:240]})

if __name__ == '__main__':
    main()
