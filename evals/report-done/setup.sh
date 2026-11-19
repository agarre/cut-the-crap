#!/usr/bin/env bash
# The fixture project is shared by the report-* cases; a scaffold script has to sit inside its own case.
exec bash "$(dirname "${BASH_SOURCE[0]}")/../_shop/setup.sh"
