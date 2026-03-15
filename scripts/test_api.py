#!/usr/bin/env python3
import argparse
import sys
import json
import time
import requests
import os
from colorama import Fore, Style, init

init(autoreset=True)

BASE_URL = os.getenv("AGRIMEMO_API_URL", "http://localhost:8000")

def print_result(title, status_code, response_json):
    color = Fore.GREEN if status_code < 400 else Fore.RED
    print(f"\n{color}=== {title} ===")
    print(f"Status Code: {status_code}")
    print(json.dumps(response_json, indent=2))
    print(f"{color}=================={Style.RESET_ALL}\n")

def test_health():
    print("Testing GET /health ...")
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
        print_result("System Health", r.status_code, r.json())
        return r.status_code == 200
    except requests.exceptions.RequestException as e:
        print(f"{Fore.RED}Error connecting to API: {e}")
        return False

def test_upload(file_path, device_id="cli-test-device"):
    print(f"Testing POST /voice-note/upload with '{file_path}' ...")
    if not os.path.exists(file_path):
        print(f"{Fore.RED}File not found: {file_path}")
        return None
        
    try:
        with open(file_path, "rb") as f:
            files = {"file": (os.path.basename(file_path), f, "audio/wav")}
            data = {"device_id": device_id}
            print("Uploading (this may take a few seconds...)")
            r = requests.post(f"{BASE_URL}/voice-note/upload", files=files, data=data, timeout=60)
            print_result("Upload Result", r.status_code, r.json())
            
            if r.status_code == 200:
                return r.json()
            return None
    except Exception as e:
        print(f"{Fore.RED}Error uploading file: {e}")
        return None

def test_list_notes():
    print("Testing GET /voice-notes ...")
    try:
        r = requests.get(f"{BASE_URL}/voice-notes?page=1&page_size=5")
        print_result("List Notes", r.status_code, r.json())
        return r.json().get("notes", []) if r.status_code == 200 else []
    except Exception as e:
        print(f"{Fore.RED}Error listing notes: {e}")
        return []

def test_get_note(note_id):
    print(f"Testing GET /voice-notes/{note_id} ...")
    try:
        r = requests.get(f"{BASE_URL}/voice-notes/{note_id}")
        print_result("Get Note", r.status_code, r.json())
        return r.status_code == 200
    except Exception as e:
        print(f"{Fore.RED}Error getting note: {e}")
        return False

def test_delete_note(note_id):
    print(f"Testing DELETE /voice-notes/{note_id} ...")
    try:
        r = requests.delete(f"{BASE_URL}/voice-notes/{note_id}")
        if r.status_code == 204:
             print(f"{Fore.GREEN}=== Delete Note ===")
             print(f"Successfully deleted note {note_id}")
             print(f"{Fore.GREEN}=================={Style.RESET_ALL}\n")
             return True
        else:
             print_result("Delete Note Failed", r.status_code, r.json())
             return False
    except Exception as e:
        print(f"{Fore.RED}Error deleting note: {e}")
        return False

def generate_test_audio():
    """Generates a simple 1-second WAV file with a beep tone for testing"""
    import wave
    import struct
    import math
    
    test_file = "test_audio.wav"
    try:
        with wave.open(test_file, 'w') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(16000)
            num_frames = 16000 * 1
            for i in range(num_frames):
                value = int(32767.0 * math.sin(2.0 * math.pi * 440.0 * (i / 16000.0)))
                wav_file.writeframes(struct.pack('h', value))
        return test_file
    except Exception as e:
        print(f"Failed to generate test audio: {e}")
        return None

def run_all_checks():
    print(f"{Fore.CYAN}Starting full API end-to-end check...{Style.RESET_ALL}")
    
    # 1. Check Health
    if not test_health():
        print(f"{Fore.RED}System is offline or unhealthy. Aborting.{Style.RESET_ALL}")
        sys.exit(1)
        
    # 2. Generate Test Audio
    print("Generating temporary test audio file...")
    audio_path = generate_test_audio()
    if not audio_path:
        sys.exit(1)
        
    try:
        # 3. Upload File
        note_data = test_upload(audio_path)
        if not note_data:
            print(f"{Fore.RED}Upload failed. Aborting further tests.{Style.RESET_ALL}")
            sys.exit(1)
            
        note_id = note_data.get("note_id")
        
        # 4. Give the system a tiny bit of time to settle memory stores
        time.sleep(1)
        
        # 5. Get Note Detail
        if not test_get_note(note_id):
            print(f"{Fore.RED}Failed to fetch the uploaded note details.{Style.RESET_ALL}")
            sys.exit(1)
            
        # 6. List Notes
        notes = test_list_notes()
        found = any(n.get("note_id") == note_id for n in notes)
        if not found:
             print(f"{Fore.RED}Uploaded note not found in the notes list!{Style.RESET_ALL}")
             sys.exit(1)
        else:
             print(f"{Fore.GREEN}Verified note exists in the notes list array.{Style.RESET_ALL}\n")
             
        # 7. Delete Note
        if not test_delete_note(note_id):
             print(f"{Fore.RED}Failed to delete note.{Style.RESET_ALL}")
             sys.exit(1)
             
        # 8. Verify Deletion
        print("Verifying note is deleted (expecting 404)...")
        r = requests.get(f"{BASE_URL}/voice-notes/{note_id}")
        if r.status_code == 404:
             print(f"{Fore.GREEN}Verified note '{note_id}' returns 404 Not Found.{Style.RESET_ALL}")
        else:
             print(f"{Fore.RED}Warning: Note still seems to exist! Status Code: {r.status_code}{Style.RESET_ALL}")
             
        print(f"\n{Fore.GREEN}=== ALL CHECKS PASSED SUCCESSFULLY ==={Style.RESET_ALL}")
        
    finally:
        # Cleanup temp audio
        if os.path.exists(audio_path):
            os.remove(audio_path)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AgriMemo API CLI Tester")
    parser.add_argument("--url", default="http://localhost:8000", help="API Base URL")
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Subcommands
    subparsers.add_parser("health", help="Check system health")
    subparsers.add_parser("list", help="List recent notes")
    subparsers.add_parser("all", help="Run full end-to-end automated checks")
    
    get_parser = subparsers.add_parser("get", help="Get a single note by ID")
    get_parser.add_argument("id", help="UUID of the note")
    
    del_parser = subparsers.add_parser("delete", help="Delete a single note by ID")
    del_parser.add_argument("id", help="UUID of the note")
    
    up_parser = subparsers.add_parser("upload", help="Upload an audio file")
    up_parser.add_argument("file", help="Path to the audio file (.wav, .mp3, etc)")
    up_parser.add_argument("--device", default="cli-test-device", help="Optional device ID")

    args = parser.parse_args()
    BASE_URL = args.url
    
    try:
        import requests
    except ImportError:
        print("Missing required dependency: requests")
        print("Please install via: pip install requests colorama")
        sys.exit(1)

    if args.command == "health":
        test_health()
    elif args.command == "list":
        test_list_notes()
    elif args.command == "get":
        test_get_note(args.id)
    elif args.command == "delete":
        test_delete_note(args.id)
    elif args.command == "upload":
        test_upload(args.file, args.device)
    elif args.command == "all":
        run_all_checks()
    else:
        parser.print_help()
