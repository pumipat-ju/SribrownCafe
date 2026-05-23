from fastapi import APIRouter, HTTPException
import requests

router = APIRouter(prefix="/hardware", tags=["hardware"])

# Backend อยู่ใน Docker แต่ Hardware Agent อยู่บน Windows host
HARDWARE_AGENT_URL = "http://host.docker.internal:9100"


@router.get("/")
def hardware_root():
    try:
        r = requests.get(f"{HARDWARE_AGENT_URL}/", timeout=3)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Hardware Agent not reachable: {str(e)}",
        )


@router.get("/printers")
def get_printers():
    try:
        r = requests.get(f"{HARDWARE_AGENT_URL}/printers", timeout=5)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Get printers failed: {str(e)}",
        )


@router.post("/set-printer")
def set_printer(payload: dict):
    try:
        r = requests.post(
            f"{HARDWARE_AGENT_URL}/set-printer",
            json=payload,
            timeout=5,
        )
        r.raise_for_status()
        return r.json()
    except requests.exceptions.HTTPError as e:
        detail = e.response.json().get("detail", str(e)) if e.response else str(e)
        raise HTTPException(status_code=e.response.status_code if e.response else 500, detail=detail)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Set printer failed: {str(e)}",
        )


@router.post("/open-drawer")
def open_drawer(payload: dict | None = None):
    try:
        r = requests.post(
            f"{HARDWARE_AGENT_URL}/open-drawer",
            json=payload or {},
            timeout=5,
        )
        r.raise_for_status()
        return r.json()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Open drawer failed: {str(e)}",
        )


@router.post("/print-receipt")
def print_receipt(payload: dict):
    try:
        r = requests.post(
            f"{HARDWARE_AGENT_URL}/print-receipt",
            json=payload,
            timeout=10,
        )
        r.raise_for_status()
        return r.json()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Print receipt failed: {str(e)}",
        )


@router.post("/print-and-open")
def print_and_open(payload: dict):
    try:
        r = requests.post(
            f"{HARDWARE_AGENT_URL}/print-and-open",
            json=payload,
            timeout=10,
        )
        r.raise_for_status()
        return r.json()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Print and open drawer failed: {str(e)}",
        )