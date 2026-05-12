#!/bin/bash
export PRINTER_NAME="Printer"
export HARDWARE_MOCK=true
export PRINTER_ENCODING="cp874"

echo "Starting SriBrown Hardware Agent..."
echo "Printer: $PRINTER_NAME"
echo "Mock Mode: $HARDWARE_MOCK"

python3 -m uvicorn hardware_agent:app --host 0.0.0.0 --port 9100
