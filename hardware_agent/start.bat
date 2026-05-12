@echo off
SET PRINTER_NAME=Microsoft Print to PDF
SET HARDWARE_MOCK=true
SET PRINTER_ENCODING=cp874

echo Starting SriBrown Hardware Agent...
echo Printer: %PRINTER_NAME%
echo Mock Mode: %HARDWARE_MOCK%

python -m uvicorn hardware_agent:app --host 0.0.0.0 --port 9100
pause
