from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.database import get_db
from app import models, schemas
from app.auth_utils import get_admin_user

router = APIRouter(
    prefix="/farmers",
    tags=["Farmers Management"]
)

class FarmerSummary(schemas.BaseModel):
    id: int
    full_name: str
    phone_number: str
    role: str
    is_active: bool
    created_at: str
    total_bookings: int
    completed_bookings: int
    total_quantity_procured: float

@router.get("/", response_model=List[FarmerSummary])
def list_farmers(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    """
    List all farmers with summary statistics (Total bookings, completed, procured qty).
    """
    query = db.query(models.User).filter(models.User.role == models.Role.farmer)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (models.User.full_name.ilike(search_pattern)) | 
            (models.User.phone_number.ilike(search_pattern))
        )
    
    farmers = query.order_by(models.User.created_at.desc()).all()
    results = []
    
    for f in farmers:
        bookings = db.query(models.Booking).filter(models.Booking.farmer_id == f.id).all()
        total_b = len(bookings)
        completed_b = sum(1 for b in bookings if b.status == models.QueueStatus.completed)
        total_qty = sum(
            (b.quantity_actual or b.quantity_expected or 0.0) 
            for b in bookings if b.status == models.QueueStatus.completed
        )
        
        results.append(FarmerSummary(
            id=f.id,
            full_name=f.full_name,
            phone_number=f.phone_number,
            role=f.role.value,
            is_active=f.is_active,
            created_at=f.created_at.isoformat() if f.created_at else "",
            total_bookings=total_b,
            completed_bookings=completed_b,
            total_quantity_procured=round(total_qty, 2)
        ))
        
    return results

@router.get("/{farmer_id}/details")
def get_farmer_details(
    farmer_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    farmer = db.query(models.User).filter(models.User.id == farmer_id, models.User.role == models.Role.farmer).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
        
    bookings = db.query(models.Booking).filter(models.Booking.farmer_id == farmer.id).order_by(models.Booking.created_at.desc()).all()
    
    return {
        "farmer": schemas.User.from_orm(farmer),
        "bookings": [schemas.Booking.from_orm(b) for b in bookings]
    }
