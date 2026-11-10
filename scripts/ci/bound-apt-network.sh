#!/usr/bin/env bash
# Bound apt's idle-connection timeout before `playwright install --with-deps`.
#
# apt's default per-connection timeout is 120 seconds, and the hosted Azure
# Ubuntu mirror occasionally stalls mid-download. Four stalls turned a 14 second
# step (median of 128 recorded runs, maximum 108 seconds) into 474 and 585
# seconds in run 42108859656, which then hit the 10 minute job deadline. The
# timeout counts seconds without data, so a healthy 21 MB download is unaffected.
# It does not help when the mirror keeps sending data very slowly (pull request
# runs 42169381575 and 42169563198 lost 50 minutes that way); see docs/CI-CD.md.
set -euo pipefail
printf '%s\n' \
  'Acquire::http::Timeout "20";' \
  'Acquire::https::Timeout "20";' \
  'Acquire::Retries "3";' |
  sudo tee /etc/apt/apt.conf.d/99-ci-network >/dev/null
echo "apt network bounds:"
apt-config dump | grep -E '^Acquire::(http|https)::Timeout|^Acquire::Retries'
# Diagnostic only, never fails the step: the effective values above have been
# 15 s / 1 retry in every observed job although this script writes 20 s / 3, so
# something else defines them. List every apt setting that mentions them.
echo "apt configuration sources (diagnostic):"
echo "APT_CONFIG=${APT_CONFIG:-unset}"
ls -1 /etc/apt/apt.conf.d || true
grep -rnE 'Timeout|Retries' /etc/apt/apt.conf /etc/apt/apt.conf.d 2>/dev/null || true
