#!/usr/bin/env bash
# Pre-tool-use hook entry point.
#
# Reads a tool call as JSON on stdin and writes a permission decision as JSON on
# stdout. All policy lives in scripts/authorize-tool.mjs so it can be unit
# tested; this wrapper exists so the hook command is a single portable path.
set -euo pipefail
exec node "$(dirname "$0")/authorize-tool.mjs"
