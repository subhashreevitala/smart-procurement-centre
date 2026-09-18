from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app import models, schemas
from app.auth_utils import get_admin_user

router = APIRouter(
    prefix="/centres",
    tags=["Procurement Centres & Crops"]
)

class CentreUpdate(schemas.BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    capacity_per_day: Optional[int] = None

class CropUpdate(schemas.BaseModel):
    name: Optional[str] = None
    msp: Optional[float] = None

@router.get("/", response_model=List[schemas.ProcurementCentre])
def list_centres(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    List all available procurement centres.
    """
    centres = db.query(models.ProcurementCentre).offset(skip).limit(limit).all()
    return centres

@router.post("/", response_model=schemas.ProcurementCentre, status_code=status.HTTP_201_CREATED)
def create_centre(centre_in: schemas.ProcurementCentreCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_admin_user)):
    """
    Add a new procurement mandi / centre. Admin only.
    """
    centre = models.ProcurementCentre(
        name=centre_in.name,
        location=centre_in.location,
        capacity_per_day=centre_in.capacity_per_day
    )
    db.add(centre)
    db.commit()
    db.refresh(centre)
    return centre

@router.patch("/{centre_id}", response_model=schemas.ProcurementCentre)
def update_centre(centre_id: int, centre_data: CentreUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_admin_user)):
    """
    Update procurement centre details or daily capacity. Admin only.
    """
    centre = db.query(models.ProcurementCentre).filter(models.ProcurementCentre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Procurement centre not found")
        
    if centre_data.name is not None:
        centre.name = centre_data.name
    if centre_data.location is not None:
        centre.location = centre_data.location
    if centre_data.capacity_per_day is not None:
        centre.capacity_per_day = centre_data.capacity_per_day
        
    db.commit()
    db.refresh(centre)
    return centre

@router.get("/crops", response_model=List[schemas.Crop])
def list_crops(db: Session = Depends(get_db)):
    """
    List all supported crops and their Minimum Support Prices (MSP).
    """
    crops = db.query(models.Crop).all()
    return crops

@router.post("/crops", response_model=schemas.Crop, status_code=status.HTTP_201_CREATED)
def create_crop(crop_in: schemas.CropCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_admin_user)):
    """
    Register a new crop with its MSP. Admin only.
    """
    crop = models.Crop(name=crop_in.name, msp=crop_in.msp)
    db.add(crop)
    db.commit()
    db.refresh(crop)
    return crop

@router.patch("/crops/{crop_id}", response_model=schemas.Crop)
def update_crop(crop_id: int, crop_data: CropUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_admin_user)):
    """
    Update MSP price or name for a crop. Admin only.
    """
    crop = db.query(models.Crop).filter(models.Crop.id == crop_id).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")
        
    if crop_data.name is not None:
        crop.name = crop_data.name
    if crop_data.msp is not None:
        crop.msp = crop_data.msp
        
    db.commit()
    db.refresh(crop)
    return crop
