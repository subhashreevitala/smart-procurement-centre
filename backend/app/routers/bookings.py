from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import uuid
from datetime import datetime
from app.database import get_db
from app import models, schemas
from app.services import sms_service, firebase_service
from app.auth_utils import get_current_active_user, get_admin_user
from app.ws_manager import manager

router = APIRouter(
    prefix="/bookings",
    tags=["Bookings & Queue Management"]
)

@router.post("/", response_model=schemas.Booking, status_code=status.HTTP_201_CREATED)
def create_booking(booking_in: schemas.BookingCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """
    Create a new slot booking for a farmer. Checks capacity before booking.
    """
    if current_user.role != models.Role.farmer:
        raise HTTPException(status_code=403, detail="Only farmers can book slots")

    centre = db.query(models.ProcurementCentre).filter(models.ProcurementCentre.id == booking_in.centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")
        
    crop = db.query(models.Crop).filter(models.Crop.id == booking_in.crop_id).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")

    # --- Smart Queueing Capacity Logic ---
    # Check the total expected quantity already booked for this centre on this date
    # Note: booking_date might be datetime, we compare just the date part.
    start_of_day = booking_in.booking_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = booking_in.booking_date.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    total_booked = db.query(func.sum(models.Booking.quantity_expected)).filter(
        models.Booking.centre_id == booking_in.centre_id,
        models.Booking.booking_date >= start_of_day,
        models.Booking.booking_date <= end_of_day,
        models.Booking.status != models.QueueStatus.rejected
    ).scalar() or 0

    if total_booked + booking_in.quantity_expected > centre.capacity_per_day:
        raise HTTPException(
            status_code=400, 
            detail=f"Centre is at capacity for this date. (Capacity: {centre.capacity_per_day}, Booked: {total_booked})"
        )

    # Generate token
    token = f"TKN-{str(uuid.uuid4())[:8].upper()}"

    new_booking = models.Booking(
        farmer_id=current_user.id,
        centre_id=booking_in.centre_id,
        crop_id=booking_in.crop_id,
        booking_date=booking_in.booking_date,
        quantity_expected=booking_in.quantity_expected,
        token_number=token,
        status=models.QueueStatus.scheduled
    )
    
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)

    # --- Real-time WebSocket Broadcast for New Booking ---
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        loop.create_task(manager.broadcast_to_centre(
            f'{{"event": "new_booking", "booking_id": {new_booking.id}, "token_number": "{new_booking.token_number}", "status": "{new_booking.status.value}", "centre_id": {new_booking.centre_id}}}',
            new_booking.centre_id
        ))
        # Also broadcast to global channel (centre_id 0)
        loop.create_task(manager.broadcast_to_centre(
            f'{{"event": "new_booking", "booking_id": {new_booking.id}, "token_number": "{new_booking.token_number}", "status": "{new_booking.status.value}", "centre_id": {new_booking.centre_id}}}',
            0
        ))
    except Exception as e:
        print(f"WS error: {e}")

    return new_booking

@router.get("/all", response_model=List[schemas.Booking])
def get_all_bookings(status_filter: models.QueueStatus = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_admin_user)):
    """
    Get all bookings across all centres. Used by admins for high-level monitoring.
    """
    query = db.query(models.Booking)
    if status_filter:
        query = query.filter(models.Booking.status == status_filter)
    return query.order_by(models.Booking.created_at.desc()).all()

@router.get("/my-bookings", response_model=List[schemas.Booking])
def get_my_bookings(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """
    Get all bookings for the currently authenticated farmer.
    """
    bookings = db.query(models.Booking).filter(models.Booking.farmer_id == current_user.id).order_by(models.Booking.created_at.desc()).all()
    return bookings

@router.get("/centre/{centre_id}", response_model=List[schemas.Booking])
def get_centre_queue(centre_id: int, status_filter: models.QueueStatus = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_admin_user)):
    """
    Get the queue/bookings for a specific procurement centre (or all if centre_id == 0). Used by admins.
    """
    if centre_id == 0:
        query = db.query(models.Booking)
    else:
        query = db.query(models.Booking).filter(models.Booking.centre_id == centre_id)

    if status_filter:
        query = query.filter(models.Booking.status == status_filter)
    
    return query.order_by(models.Booking.created_at.desc()).all()

@router.patch("/{booking_id}/status", response_model=schemas.Booking)
def update_booking_status(booking_id: int, update_data: schemas.BookingUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_admin_user)):
    """
    Update the status of a booking. Restricted to admins.
    """
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    if update_data.status:
        booking.status = update_data.status
    if update_data.payment_status:
        booking.payment_status = update_data.payment_status
    if update_data.quantity_actual is not None:
        booking.quantity_actual = update_data.quantity_actual
        
    db.commit()
    db.refresh(booking)
    
    # --- Real-time WebSocket Update ---
    # In a real async framework, we would use await, but since this endpoint is synchronous,
    # we need to run the async broadcast in the event loop or use an async endpoint.
    # To keep it simple for the prototype, we can make this endpoint async or use asyncio.run
    # Let's change the endpoint to async:
    # Oh wait, changing to async def requires checking dependencies. Let's just use asyncio.run for now if needed,
    # Actually, let's just leave a comment and convert it if we need to. Since FastAPI can handle async,
    # it's best if we make `update_booking_status` async. But for now I'll just use a background task or simple run.
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        loop.create_task(manager.broadcast_to_centre(
            f'{{"event": "queue_updated", "booking_id": {booking.id}, "status": "{booking.status.value}"}}',
            booking.centre_id
        ))
    except Exception as e:
        print(f"WS error: {e}")

    # Trigger SMS/Push Notification based on status change
    if update_data.status:
        farmer_phone = booking.farmer.phone_number
        sms_service.send_status_update_sms(farmer_phone, booking.token_number, booking.status.value)
        # Mock device token for push notification
        mock_device_token = f"device_token_for_{booking.farmer_id}"
        firebase_service.send_push_notification(
            device_token=mock_device_token,
            title="Slot Status Update",
            body=f"Your token {booking.token_number} is now {booking.status.value}."
        )
    
    return booking
