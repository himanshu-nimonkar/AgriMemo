import wave
import struct
import math
import os

def generate_test_wav(filename="test_note.wav", duration_sec=5, sample_rate=16000):
    """
    Generates a simple 16kHz mono WAV file with a 440Hz sine wave.
    Perfect for testing the AgriMemo upload pipeline.
    """
    print(f"Generating {filename} ({duration_sec}s, {sample_rate}Hz)...")
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(os.path.abspath(filename)), exist_ok=True)
    
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        
        num_samples = duration_sec * sample_rate
        
        for i in range(num_samples):
            # Generate a sine wave
            value = int(32767.0 * math.sin(2.0 * math.pi * 440.0 * i / sample_rate))
            data = struct.pack('<h', value)
            wav_file.writeframesraw(data)

    print(f"Success! Test file created at: {os.path.abspath(filename)}")

if __name__ == "__main__":
    target_path = os.path.join(os.getcwd(), "test_note.wav")
    generate_test_wav(target_path)
