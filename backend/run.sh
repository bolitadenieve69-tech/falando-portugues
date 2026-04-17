#!/bin/sh
# Start the tutor backend inside its virtualenv.
# Works both on Rosetta (x86_64) and native arm64 environments.
set -e
cd "$(dirname "$0")"
exec luso_tutor/bin/python3.12 -u main.py "$@"
