import re
import sys
from pathlib import Path

html_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "AppData/Local/Temp/grok-imagine2.html"
html = html_path.read_text(encoding="utf-8", errors="ignore")

patterns = {
    "og_image": r'property="og:image" content="([^"]+)"',
    "og_video": r'property="og:video" content="([^"]+)"',
    "description": r'name="description" content="([^"]+)"',
    "contentUrl": r'"contentUrl"\s*:\s*"([^"]+)"',
    "share_images": r'https://imagine-public\.x\.ai/imagine-public/share-images/[^"\\]+',
    "share_videos": r'https://imagine-public\.x\.ai/imagine-public/share-videos/[^"\\]+',
}

for name, pat in patterns.items():
    hits = re.findall(pat, html)
    print(f"=== {name} ===")
    for h in hits[:8]:
        print(h)
