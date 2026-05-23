from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import datetime
import json
import os
import platform
import subprocess
import shutil
from dotenv import load_dotenv, set_key

print(f"DEBUG: HARDWARE_MOCK before load_dotenv: {os.getenv('HARDWARE_MOCK')}")
load_dotenv()
print(f"DEBUG: HARDWARE_MOCK after load_dotenv: {os.getenv('HARDWARE_MOCK')}")
# --- OS Detection ---
CURRENT_OS = platform.system()  # "Windows", "Darwin" (macOS), "Linux"

# --- Optional Imports ---
try:
    if CURRENT_OS == "Windows":
        import win32print
    else:
        win32print = None
except ImportError:
    win32print = None

app = FastAPI(title="SriBrown Hardware Agent (Cross-Platform)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Configuration ---
# Read from environment variables
PRINTER_NAME = os.getenv("PRINTER_NAME", "Microsoft Print to PDF" if CURRENT_OS == "Windows" else "Printer")
HARDWARE_MOCK = os.getenv("HARDWARE_MOCK", "false").lower() == "true"
PRINTER_ENCODING = os.getenv("PRINTER_ENCODING", "cp874") # cp874 for Thai ESC/POS, or utf-8

# --- Printer Commands (ESC/POS) ---
CMD_INIT = b"\x1b\x40"
CMD_SELECT_THAI = b"\x1b\x74\x1e"  # ESC t 30 (Select CP874 Thai Character Table)
CMD_DRAWER_KICK = b"\x1b\x70\x00\x19\xfa"
CMD_CUT = b"\x1d\x56\x42\x00"

def get_align_cmd(align: str) -> bytes:
    if align == "center":
        return b"\x1b\x61\x01"
    elif align == "right":
        return b"\x1b\x61\x02"
    else:
        return b"\x1b\x61\x00"

def line(text: str = "", align: str = "left") -> bytes:
    align_cmd = get_align_cmd(align)
    # Using errors="replace" to avoid crashing on unsupported characters
    return align_cmd + str(text).encode(PRINTER_ENCODING, errors="replace") + b"\n"

def get_available_printers():
    printers = []
    try:
        if CURRENT_OS == "Windows" and win32print:
            # PRINTER_ENUM_LOCAL = 2, PRINTER_ENUM_CONNECTIONS = 4
            enum_printers = win32print.EnumPrinters(6)
            printers = [p[2] for p in enum_printers]
        elif CURRENT_OS in ["Darwin", "Linux"]:
            if shutil.which("lpstat"):
                output = subprocess.check_output(["lpstat", "-p"], text=True)
                for l in output.splitlines():
                    if l.startswith("printer "):
                        # Format: "printer HP_LaserJet_Professional_M1212nf_MFP is idle. enabled since..."
                        parts = l.split(" ")
                        if len(parts) > 1:
                            printers.append(parts[1])
    except Exception as e:
        print(f"Error listing printers: {e}")
    return printers

def check_printer_status():
    if os.getenv("HARDWARE_MOCK", "false").lower() == "true":
        return

    if CURRENT_OS == "Windows":
        if win32print is None:
            return
        
        hprinter = None
        try:
            hprinter = win32print.OpenPrinter(PRINTER_NAME)
            info = win32print.GetPrinter(hprinter, 2)
            status = info.get("Status", 0)
            
            if status & 0x00000080:  # PRINTER_STATUS_OFFLINE
                raise Exception("เครื่องพิมพ์ออฟไลน์ (Offline) กรุณาเปิดเครื่องพิมพ์หรือตรวจสอบสายการเชื่อมต่อ")
            if status & 0x00000010:  # PRINTER_STATUS_PAPER_OUT
                raise Exception("กระดาษพิมพ์ใบเสร็จหมด (Paper Out) กรุณาใส่กระดาษม้วนใหม่")
            if status & 0x00000400:  # PRINTER_STATUS_DOOR_OPEN
                raise Exception("ฝาครอบเครื่องพิมพ์เปิดอยู่ (Door Open) กรุณาปิดฝาครอบให้สนิท")
            if status & 0x00000008:  # PRINTER_STATUS_PAPER_JAM
                raise Exception("กระดาษติดในหัวพิมพ์ (Paper Jam) กรุณาตรวจสอบภายในเครื่อง")
        except Exception as e:
            if isinstance(e, HTTPException):
                raise
            raise HTTPException(status_code=503, detail=str(e))
        finally:
            if hprinter:
                win32print.ClosePrinter(hprinter)

    elif CURRENT_OS in ["Darwin", "Linux"]:
        if not shutil.which("lpstat"):
            return
        try:
            output = subprocess.check_output(["lpstat", "-p", PRINTER_NAME], text=True)
            if "disabled" in output.lower() or "offline" in output.lower():
                raise Exception("เครื่องพิมพ์ปิดการใช้งานหรือออฟไลน์ (Disabled/Offline)")
        except Exception as e:
            if isinstance(e, HTTPException):
                raise
            raise HTTPException(status_code=503, detail=str(e))

def raw_print(data: bytes):
    if os.getenv("HARDWARE_MOCK", "false").lower() == "true":
        print("\n--- [MOCK PRINT START] ---")
        # Try decoding using the specific encoding
        try:
            # We need to manually handle the binary commands if we want to see text
            # Replace common ESC/POS commands for cleaner mock output
            readable_data = data.replace(CMD_INIT, b"")
            readable_data = readable_data.replace(CMD_SELECT_THAI, b"")
            readable_data = readable_data.replace(CMD_DRAWER_KICK, b"[DRAWER KICK]")
            readable_data = readable_data.replace(CMD_CUT, b"\n[CUT]\n")
            
            # Remove align commands for cleaner text display
            # They usually start with \x1b\x61
            import re
            readable_data = re.sub(b"\x1b\x61[\x00-\x02]", b"", readable_data)
            
            # Remove double size commands
            readable_data = re.sub(b"\x1d\x21[\x00-\xff]", b"", readable_data)

            print(readable_data.decode(PRINTER_ENCODING, errors="replace"))
        except:
            print(f"RAW (HEX): {data.hex()}")
        print("--- [MOCK PRINT END] ---\n")
        return

    # ตรวจสอบสถานะเครื่องพิมพ์จริงก่อนส่งคำสั่งพิมพ์
    check_printer_status()

    if CURRENT_OS == "Windows":
        if win32print is None:
            raise HTTPException(status_code=500, detail="pywin32 is not installed or import failed on Windows.")
        
        try:
            # Verify printer exists
            available = get_available_printers()
            if PRINTER_NAME not in available:
                raise Exception(f"Printer '{PRINTER_NAME}' not found. Available: {', '.join(available)}")

            hprinter = win32print.OpenPrinter(PRINTER_NAME)
            try:
                win32print.StartDocPrinter(hprinter, 1, ("SriBrown Receipt", None, "RAW"))
                win32print.StartPagePrinter(hprinter)
                win32print.WritePrinter(hprinter, data)
                win32print.EndPagePrinter(hprinter)
                win32print.EndDocPrinter(hprinter)
            finally:
                win32print.ClosePrinter(hprinter)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Windows Printer Error: {str(e)}")

    elif CURRENT_OS in ["Darwin", "Linux"]:
        if not shutil.which("lp"):
            raise HTTPException(status_code=500, detail="CUPS 'lp' command not found. Please install CUPS.")
        
        # Verify printer exists
        available = get_available_printers()
        if PRINTER_NAME not in available:
             # If PRINTER_NAME is just "Printer" (default), we might want to be more lenient or specific
             if PRINTER_NAME != "Printer":
                raise HTTPException(status_code=404, detail=f"Printer '{PRINTER_NAME}' not found. Available: {', '.join(available)}")

        try:
            # Send raw ESC/POS data
            process = subprocess.Popen(
                ["lp", "-d", PRINTER_NAME, "-o", "raw"],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            stdout, stderr = process.communicate(input=data)
            if process.returncode != 0:
                err_msg = stderr.decode()
                # Fallback to plain text if -o raw is not supported
                print(f"Raw print failed, falling back to text: {err_msg}")
                subprocess.run(["lp", "-d", PRINTER_NAME], input=data, check=True)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unix Printer Error: {str(e)}")
    else:
        raise HTTPException(status_code=500, detail=f"Unsupported OS: {CURRENT_OS}")

def is_mock_mode():
    return os.getenv("HARDWARE_MOCK", "false").lower() == "true"

# --- Endpoints ---

@app.get("/")
def root():
    return {
        "status": "hardware agent running",
        "os": CURRENT_OS,
        "mock_mode": is_mock_mode(),
        "printer_name": PRINTER_NAME,
        "encoding": PRINTER_ENCODING,
        "available_printers": get_available_printers()
    }

@app.get("/printers")
def list_printers():
    return {
        "printers": get_available_printers(),
        "current": PRINTER_NAME
    }

@app.post("/set-printer")
def set_printer(payload: dict):
    global PRINTER_NAME
    new_name = payload.get("printer_name", "").strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="printer_name is required")

    available = get_available_printers()
    if available and new_name not in available:
        raise HTTPException(
            status_code=404,
            detail=f"Printer '{new_name}' not found. Available: {', '.join(available)}"
        )

    PRINTER_NAME = new_name
    print(f"[CONFIG] Printer changed to: {PRINTER_NAME}")

    # Save to .env permanently
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    try:
        set_key(env_path, "PRINTER_NAME", new_name)
        print(f"[CONFIG] Saved {new_name} to {env_path}")
    except Exception as e:
        print(f"[ERROR] Failed to save to .env: {e}")

    return {"status": "success", "printer_name": PRINTER_NAME}

@app.post("/open-drawer")
def open_drawer(payload: Optional[dict] = None):
    payload = payload or {}
    reason = payload.get("reason", "manual_open")
    employee = payload.get("employee", "System")

    if is_mock_mode():
        print(f"--- [MOCK] Drawer Opened (Reason: {reason}, By: {employee}) ---")
        return {"status": "success", "message": f"mock drawer opened for {reason}"}

    try:
        print(f"Opening drawer. Reason: {reason}, Employee: {employee}")
        raw_print(CMD_DRAWER_KICK)
        return {"status": "success", "message": "drawer opened"}
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise

def generate_receipt_data(txn: dict, kick_drawer: bool = False) -> bytes:
    items = txn.get("items", [])
    if isinstance(items, str):
        try:
            items = json.loads(items)
        except:
            items = []

    now = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")

    data = CMD_INIT
    if kick_drawer:
        data += CMD_DRAWER_KICK
    data += CMD_SELECT_THAI

    # 🌟 Add Queue Number at the top
    queue = txn.get("queueNumber") or "-"

    # 🌟 Add to mock log explicitly
    if is_mock_mode():
        print(f"--- [MOCK] QUEUE: {queue} ---")

    data += get_align_cmd("center")
    data += b"\x1d\x21\x11" # Double height/width
    data += b"QUEUE: " + str(queue).encode(PRINTER_ENCODING, errors="replace") + b"\n"
    data += b"\x1d\x21\x00" # Normal size
    data += line("-" * 32)

    data += line("SRI BROWN", "center")
    data += line("Coffee Roastery", "center")
    data += line("-" * 32)
    data += line(f"Bill: {txn.get('bill_id', '-')}")
    data += line(f"Time: {now}")
    data += line(f"Cashier: {txn.get('cashier', '-')}")
    data += line("-" * 32)

    for item in items:
        # Support name_th, name_en, or name
        name = item.get("name_th") or item.get("name_en") or item.get("name") or "-"
        qty = float(item.get("qty", 1) or 1)
        price = float(item.get("price", 0) or 0)
        total = qty * price

        data += line(name)
        data += line(f"{qty:g} x {price:,.2f} = {total:,.2f}", "right")
        if item.get("options"):
            data += line(f"- {item.get('options')}")

    data += line("-" * 32)

    subtotal = float(txn.get("subtotal", 0) or 0)
    discount = float(txn.get("discount", 0) or 0)
    vat = float(txn.get("vatAmount", 0) or 0)
    amount = float(txn.get("amount", 0) or 0)

    data += line(f"Subtotal: {subtotal:,.2f}", "right")
    if discount > 0:
        data += line(f"Discount: -{discount:,.2f}", "right")
    if txn.get("promotionName"):
        data += line(f"Promo: {txn.get('promotionName')}")
    if txn.get("couponName"):
        data += line(f"Coupon: {txn.get('couponName')}")
    
    data += line(f"VAT 7%: {vat:,.2f}", "right")
    data += line("=" * 32)
    data += line(f"TOTAL: {amount:,.2f}", "right")
    data += line("=" * 32)
    data += line("")
    data += line("Thank you", "center")
    data += line("")
    data += line("")
    data += CMD_CUT
    return data

@app.post("/print-receipt")
def print_receipt(payload: dict):
    # Some payloads might wrap txn inside txn
    txn = payload.get("txn", payload)

    if is_mock_mode():
        print("--- [MOCK] Printing Receipt Payload ---")
        print(json.dumps(txn, indent=2, ensure_ascii=False))

    data = generate_receipt_data(txn, kick_drawer=False)
    raw_print(data)

    return {"status": "success", "message": "receipt printed"}

@app.post("/print-and-open")
def print_and_open(payload: dict):
    txn = payload.get("txn", payload)

    if is_mock_mode():
        print("--- [MOCK] Printing Receipt Payload (with Drawer Kick) ---")
        print(json.dumps(txn, indent=2, ensure_ascii=False))
        print("--- [MOCK] Drawer Opened ---")

    data = generate_receipt_data(txn, kick_drawer=True)
    raw_print(data)
    
    return {"status": "success", "message": "receipt printed and drawer opened"}

if __name__ == "__main__":
    import uvicorn
    # Default to 9100 as requested
    uvicorn.run(app, host="0.0.0.0", port=9100)
