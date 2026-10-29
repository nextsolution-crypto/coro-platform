#!/bin/sh
set -eu
mkdir -p /evidence/inspection /evidence/renders
for file in /evidence/*.pdf; do
  base="$(basename "$file" .pdf)"
  pdfinfo "$file" > "/evidence/inspection/${base}-pdfinfo.txt"
  pdffonts "$file" > "/evidence/inspection/${base}-fonts.txt"
  pdftotext -layout "$file" "/evidence/inspection/${base}.txt"
  pdftoppm -png -r 90 "$file" "/evidence/renders/${base}" >/dev/null 2>&1
done
for file in /evidence/inspection/*-pdfinfo.txt; do
  echo "==== $file"
  grep -E '^(Pages|Page size|PDF version|Tagged|Encrypted|File size)' "$file"
done
