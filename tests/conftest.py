"""Shared fixtures: make the modules in files/ importable and locate external tools."""
import os
import shutil
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = os.path.join(ROOT, "files")
sys.path.insert(0, FILES)


def pytest_configure(config):
    config.addinivalue_line("markers", "multimon: needs the multimon-ng binary")


@pytest.fixture(scope="session")
def multimon():
    exe = shutil.which("multimon-ng")
    if not exe:
        pytest.skip("multimon-ng is not installed")
    return exe
