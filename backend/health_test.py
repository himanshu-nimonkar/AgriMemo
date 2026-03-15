import asyncio
import json
from app.config import settings
from app.services.deepgram_service import DeepgramService
from app.services.structuring_engine import StructuringEngine
import httpx

async def check():
    print(f"Deepgram Key: len={len(settings.deepgram_api_key)} val={settings.deepgram_api_key[:4]}...{settings.deepgram_api_key[-4:]}")
    print(f"Cloudflare Token: len={len(settings.cloudflare_api_token)} val={settings.cloudflare_api_token[:4]}...{settings.cloudflare_api_token[-4:]}")
    print(f"Cloudflare Account: {settings.cloudflare_account_id}")

    # deepgram check
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.deepgram.com/v1/listen",
                content=b"",
                headers={
                    "Authorization": f"Token {settings.deepgram_api_key}",
                    "Content-Type": "audio/wav",
                },
                timeout=5.0
            )
            print(f"Deepgram raw HTTP status: {resp.status_code}")
            if resp.status_code == 401:
                print("Deepgram 401: error:", resp.text)
    except Exception as e:
        print(f"Deepgram exception: {e}")

    # cloudflare check
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                settings.cloudflare_ai_url,
                json={"messages": [{"role":"user", "content":"hi"}], "max_tokens": 1},
                headers={
                    "Authorization": f"Bearer {settings.cloudflare_api_token}",
                    "Content-Type": "application/json",
                },
                timeout=5.0
            )
            print(f"Cloudflare raw HTTP status: {resp.status_code}")
            if resp.status_code != 200:
                print("Cloudflare error:", resp.text)
    except Exception as e:
        print(f"Cloudflare exception: {e}")

asyncio.run(check())
