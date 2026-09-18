from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .models import Role, QueueStatus, PaymentStatus

# --- User Schemas ---
class UserBase(BaseModel):
    phone_number: str
    full_name: str

class UserCreate(UserBase):
    pass

class UserRegisterWithOTP(BaseModel):
    phone_number: str
    full_name: str
    otp: str
    aadhaar: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    land_acres: Optional[float] = None

class User(UserBase):
    id: int
    role: Role
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Auth & OTP Schemas ---
class OTPRequest(BaseModel):
    phone_number: str
    purpose: Optional[str] = "login" # "login" or "register"

class OTPResponse(BaseModel):
    success: bool
    message: str
    phone_number: str
    expires_in_seconds: int = 300
    dev_otp: Optional[str] = None

class OTPVerifyRequest(BaseModel):
    phone_number: str
    otp: str
    purpose: Optional[str] = "login"

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

# --- Procurement Centre Schemas ---
class ProcurementCentreBase(BaseModel):
    name: str
    location: str
    capacity_per_day: int

class ProcurementCentreCreate(ProcurementCentreBase):
    pass

class ProcurementCentre(ProcurementCentreBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Crop Schemas ---
class CropBase(BaseModel):
    name: str
    msp: float

class CropCreate(CropBase):
    pass

class Crop(CropBase):
    id: int

    class Config:
        from_attributes = True

# --- Booking Schemas ---
class BookingBase(BaseModel):
    centre_id: int
    crop_id: int
    booking_date: datetime
    quantity_expected: float

class BookingCreate(BookingBase):
    pass

class BookingUpdate(BaseModel):
    status: Optional[QueueStatus] = None
    payment_status: Optional[PaymentStatus] = None
    quantity_actual: Optional[float] = None

class Booking(BookingBase):
    id: int
    farmer_id: int
    status: QueueStatus
    payment_status: PaymentStatus
    token_number: str
    quantity_actual: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    
    # Nested for easier frontend consumption
    centre: Optional[ProcurementCentre] = None
    crop: Optional[Crop] = None
    farmer: Optional[User] = None

    class Config:
        from_attributes = True
