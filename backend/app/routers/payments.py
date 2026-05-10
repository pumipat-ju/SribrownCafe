from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import os
import omise

router = APIRouter(prefix="/payments", tags=["payments"])

omise.api_public = os.getenv("OMISE_PUBLIC_KEY")
omise.api_secret = os.getenv("OMISE_SECRET_KEY")


class QRRequest(BaseModel):
    amount: float
    order_id: str


# ==============================
# Create PromptPay QR
# ==============================
@router.post("/qr/create")
async def create_qr(data: QRRequest):
    try:
        source = omise.Source.create(
            amount=int(data.amount * 100),
            currency="thb",
            type="promptpay"
        )

        charge = omise.Charge.create(
            amount=int(data.amount * 100),
            currency="thb",
            source=source.id,
            metadata={"order_id": data.order_id}
        )

        # access แบบ dict เพราะ omise object ไม่มี attribute scannable_code
        charge_dict = charge.__dict__
        source_dict = charge_dict["_attributes"]["source"]
        qr_uri = source_dict["scannable_code"]["image"]["download_uri"]

        if not qr_uri:
            raise HTTPException(status_code=500, detail="QR URI not found")

        return {
            "qrCode": qr_uri,
            "chargeId": charge.id,
            "sourceId": source.id
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==============================
# Check payment status
# ==============================
@router.get("/qr/status/{charge_id}")
async def check_status(charge_id: str):
    try:
        charge = omise.Charge.retrieve(charge_id)

        if charge.status == "successful":
            return {
                "status": "PAID",
                "transactionId": charge.id
            }

        return {"status": "PENDING"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==============================
# Webhook
# ==============================
@router.post("/webhook")
async def payment_webhook(request: Request):
    payload = await request.json()

    event_key = payload.get("key")

    if event_key == "charge.complete":
        data = payload.get("data", {})
        order_id = data.get("metadata", {}).get("order_id")
        print(f"Payment success for order {order_id}")
        # TODO: update transaction db

    return {"ok": True}