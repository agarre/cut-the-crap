#!/usr/bin/env bash
# Copies the fixture project into the run's empty workspace, where the agent starts.
set -euo pipefail
cp -R "$(dirname "${BASH_SOURCE[0]}")/project/." .
