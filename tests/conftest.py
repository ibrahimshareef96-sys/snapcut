"""Make template/tools and scripts importable. The tools read project.json only when a function asks for it, so the
pure parts can be tested without a video project."""
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path[:0] = [str(REPO / "template" / "tools"), str(REPO / "scripts")]
