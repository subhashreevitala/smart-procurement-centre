from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List
from app.database import get_db
from app import models, schemas
from app.auth_utils import get_admin_user

router = APIRouter(
    prefix="/reports",
    tags=["Procurement Reports & Analytics"]
)

@router.get("/summary")
def get_procurement_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
) -> Dict[str, Any]:
    """
    Get comprehensive procurement analytics, financial disbursement, mandi utilization, and crop distributions.
    """
    total_farmers = db.query(models.User).filter(models.User.role == models.Role.farmer).count()
    all_bookings = db.query(models.Booking).all()
    all_centres = db.query(models.ProcurementCentre).all()
    all_crops = db.query(models.Crop).all()

    crops_map = {c.id: c for c in all_crops}
    centres_map = {c.id: c for c in all_centres}

    total_bookings = len(all_bookings)
    completed_bookings = [b for b in all_bookings if b.status == models.QueueStatus.completed]
    
    total_procured_qty = sum(
        (b.quantity_actual or b.quantity_expected or 0.0) 
        for b in completed_bookings
    )

    total_expected_all = sum(b.quantity_expected for b in all_bookings)

    # Financial calculations based on crop MSP
    total_disbursed_payout = 0.0
    total_pending_payout = 0.0

    for b in all_bookings:
        crop = crops_map.get(b.crop_id)
        msp = crop.msp if crop else 0.0
        qty = b.quantity_actual or b.quantity_expected or 0.0
        amount = qty * msp

        if b.payment_status == models.PaymentStatus.completed:
            total_disbursed_payout += amount
        elif b.payment_status in [models.PaymentStatus.pending, models.PaymentStatus.processing]:
            total_pending_payout += amount

    # Centre-by-centre breakdown
    centre_breakdown = []
    for c in all_centres:
        c_bookings = [b for b in all_bookings if b.centre_id == c.id]
        c_completed = [b for b in c_bookings if b.status == models.QueueStatus.completed]
        c_procured = sum((b.quantity_actual or b.quantity_expected or 0.0) for b in c_completed)
        c_expected = sum(b.quantity_expected for b in c_bookings)
        utilization = round((c_expected / max(1, c.capacity_per_day)) * 100, 1)

        centre_breakdown.append({
            "id": c.id,
            "name": c.name,
            "location": c.location,
            "capacity_per_day": c.capacity_per_day,
            "total_bookings": len(c_bookings),
            "completed_bookings": len(c_completed),
            "total_procured_qty": round(c_procured, 2),
            "total_expected_qty": round(c_expected, 2),
            "utilization_percentage": utilization
        })

    # Crop-by-crop breakdown
    crop_breakdown = []
    for crop in all_crops:
        crop_bookings = [b for b in all_bookings if b.crop_id == crop.id]
        crop_completed = [b for b in crop_bookings if b.status == models.QueueStatus.completed]
        crop_procured = sum((b.quantity_actual or b.quantity_expected or 0.0) for b in crop_completed)
        crop_payout = crop_procured * crop.msp

        crop_breakdown.append({
            "id": crop.id,
            "name": crop.name,
            "msp": crop.msp,
            "total_bookings": len(crop_bookings),
            "total_procured_qty": round(crop_procured, 2),
            "total_payout_inr": round(crop_payout, 2)
        })

    # Status distribution
    status_counts = {}
    for st in models.QueueStatus:
        status_counts[st.value] = sum(1 for b in all_bookings if b.status == st)

    # Payment distribution
    payment_counts = {}
    for p in models.PaymentStatus:
        payment_counts[p.value] = sum(1 for b in all_bookings if b.payment_status == p)

    return {
        "metrics": {
            "total_farmers": total_farmers,
            "total_bookings": total_bookings,
            "completed_bookings": len(completed_bookings),
            "total_procured_quintals": round(total_procured_qty, 2),
            "total_expected_quintals": round(total_expected_all, 2),
            "total_disbursed_payout_inr": round(total_disbursed_payout, 2),
            "total_pending_payout_inr": round(total_pending_payout, 2),
        },
        "centres": centre_breakdown,
        "crops": crop_breakdown,
        "status_distribution": status_counts,
        "payment_distribution": payment_counts
    }
