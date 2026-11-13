#!/bin/bash
# Bangun ulang visualisasi Ford-Fulkerson (folder visualizer/) ke graph/ff/ supaya bisa dibuka di /graph/ff/.
# Build dilakukan di salinan sementara, jadi folder visualizer/ tidak berubah dan tidak ada node_modules di repo.
# Jalankan setiap kali visualizer/ diperbarui:  bash graph/bangun_ff.sh

set -euo pipefail

AKAR="$(cd "$(dirname "$0")/.." && pwd)"
SALINAN="$(mktemp -d)"

rsync -a --exclude node_modules --exclude dist "$AKAR/visualizer/" "$SALINAN/visualizer/"
cd "$SALINAN/visualizer"
npm ci
npx vite build --base=/graph/ff/ --outDir "$AKAR/graph/ff" --emptyOutDir

echo "Selesai: $AKAR/graph/ff (salinan build di $SALINAN)"
