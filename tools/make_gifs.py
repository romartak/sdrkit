#!/usr/bin/env python3
"""Turns the frames recorded by tools/gifs.mjs into small looping GIFs for the README.

    python3 tools/make_gifs.py /tmp/sdrkit-frames docs/media/gifs     (needs Pillow)
"""
import sys
from pathlib import Path

from PIL import Image

WIDTH = 330          # px: three GIFs side by side still fit the GitHub README column


def make(frames_dir, out, every_ms):
    files = sorted(frames_dir.glob("*.png"))
    frames = []
    for f in files:
        im = Image.open(f).convert("RGB")
        h = round(im.height * WIDTH / im.width)
        im = im.resize((WIDTH, h), Image.LANCZOS)
        frames.append(im.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE))
    frames[0].save(out, save_all=True, append_images=frames[1:], duration=every_ms, loop=0, optimize=True)
    print("%-10s %3d frames  %6.0f KB" % (out.name, len(frames), out.stat().st_size / 1024))


if __name__ == "__main__":
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    dst.mkdir(parents=True, exist_ok=True)
    for name, every in (("analyzer", 200), ("radio", 200), ("radar", 300), ("pagers", 400)):
        if (src / name).is_dir():
            make(src / name, dst / f"{name}.gif", every)
