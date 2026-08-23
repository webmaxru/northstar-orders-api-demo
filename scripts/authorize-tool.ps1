# Pre-tool-use hook entry point for Windows.
#
# GitHub Copilot hooks require a `powershell` command on Windows and a `bash`
# command on Unix. Both wrappers delegate to the same Node module so the policy
# has exactly one implementation and one set of tests.
#
# Reads a tool call as JSON on stdin, writes a permission decision as JSON on
# stdout.
$ErrorActionPreference = "Stop"
$input | & node (Join-Path $PSScriptRoot "authorize-tool.mjs")
