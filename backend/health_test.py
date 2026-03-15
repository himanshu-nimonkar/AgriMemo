import asyncio
import json
from app.config import settings
from app.services.deepgram_service import DeepgramService
from app.services.structuring_engine import StructuringEngine
import httpx

async def check():
    print(f"Deepgram Key: configured={bool(settings.deepgram_api_key)} len={len(settings.deepgram_api_key) if settings.deepgram_api_key else 0} (value redacted)")
    print(f"Cloudflare Token: configured={bool(settings.cloudflare_api_token)} len={len(settings.cloudflare_api_token) if settings.cloudflare_api_token else 0} (value redacted)")
    print(f"Cloudflare Account ID: configured={bool(settings.cloudflare_account_id)} len={len(settings.cloudflare_account_id) if settings.cloudflare_account_id else 0} (value redacted)")

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
