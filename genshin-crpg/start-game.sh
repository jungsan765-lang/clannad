#!/bin/sh
cd "$(dirname "$0")"
python3 -m http.server 8765 --directory dist --bind 127.0.0.1
