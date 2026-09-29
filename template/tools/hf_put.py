"""PUT local files to Higgsfield presigned upload URLs.

Usage: python3 hf_put.py MAP_JSON SRC_DIR
MAP_JSON is a list of [filename, upload_url] pairs from media_upload. Filenames must be plain names of images or
videos inside SRC_DIR (500 MB at most); URLs must be https on upload.higgsfield.ai. Uploading sends the user's
footage to Higgsfield: only after they said yes. Prints one status line per file (with curl's error or the response
body on failure); exits non-zero if any upload fails.
"""
import json
import mimetypes
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse

ALLOWED_HOST = "upload.higgsfield.ai"
MAX_BYTES = 500 * 1024 * 1024        # references are stills and short clips


def check(name: str, url: str, src: Path) -> Path:
    if not isinstance(name, str) or not isinstance(url, str):
        raise ValueError(f"entry {name!r}: name and url must be strings")
    path = (src / name).resolve()
    if Path(name).name != name or src.resolve() not in path.parents:
        raise ValueError(f"{name!r} is not a plain file name inside {src}")
    u = urlparse(url)
    if (u.scheme != "https" or u.hostname != ALLOWED_HOST or u.username or u.password or u.port not in (None, 443)
            or "\\" in url):
        raise ValueError(f"refusing upload URL for {name!r}: must be https://{ALLOWED_HOST}/...")
    kind = (mimetypes.guess_type(path.name)[0] or "").split("/")[0]
    if kind not in ("image", "video"):
        raise ValueError(f"{name!r}: only images and videos are uploaded")
    if not path.is_file():
        raise ValueError(f"missing file {path}")
    if path.stat().st_size > MAX_BYTES:
        raise ValueError(f"{name!r} is larger than {MAX_BYTES // (1024 * 1024)} MB")
    return path


def put(path: Path, url: str) -> tuple[int, str]:
    ctype = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    try:
        res = subprocess.run(
            ["curl", "-sS", "--proto", "=https", "-w", "\n%{http_code}", "-X", "PUT", "-H", f"Content-Type: {ctype}",
             "--data-binary", f"@{path}", "--url", url],
            capture_output=True, text=True, timeout=600,
        )
    except subprocess.TimeoutExpired:
        return 0, "timed out after 600 s"
    body, _, code = res.stdout.rpartition("\n")
    detail = (res.stderr.strip() or body.strip())[-400:]
    return (int(code) if code.isdigit() else 0), detail


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit("usage: hf_put.py MAP_JSON SRC_DIR")
    pairs = json.loads(Path(sys.argv[1]).read_text())
    src = Path(sys.argv[2])
    if src.resolve() in (Path.home().resolve(), Path("/").resolve()):
        sys.exit("SRC_DIR must be a folder of references (the work folder's hf/refs), not your home or /")
    if not isinstance(pairs, list):
        sys.exit("MAP_JSON must be a list of [filename, upload_url] pairs")
    failed = 0
    for pair in pairs:
        try:
            if not isinstance(pair, list) or len(pair) != 2:
                raise ValueError(f"{pair!r} is not a [filename, upload_url] pair")
            name, url = pair
            path = check(name, url, src)
        except ValueError as err:
            print(f"SKIP {err}")
            failed += 1
            continue
        code, detail = put(path, url)
        print(f"{code} {name}" + ("" if code == 200 else f"  {detail}"))
        failed += code != 200
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
