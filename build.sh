#!/usr/bin/env bash
# Render build script (optional — render.yaml uses buildCommand directly)
set -euo pipefail
pip install --upgrade pip
pip install -r requirements.txt
