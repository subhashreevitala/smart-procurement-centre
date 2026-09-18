from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Float, Enum as SQLAlchemyEnum
from sqlalchemy.orm import relationship
import enum
from datetime import datetime

from .database import Base

class Role(str, enum.Enum):
    farmer = "farmer"
    admin = "admin"

class QueueStatus(str, enum.Enum):
    scheduled = "scheduled"
    checked_in = "checked_in"
    weighing = "weighing"
    quality_check = "quality_check"
    completed = "completed"
    rejected = "rejected"

class PaymentStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String, unique=True, index=True)
    full_name = Column(String)
    role = Column(SQLAlchemyEnum(Role), default=Role.farmer)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    bookings = relationship("Booking", back_populates="farmer")

class ProcurementCentre(Base):
    __tablename__ = "procurement_centres"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    location = Column(String)
    capacity_per_day = Column(Integer)  # in quintals
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    bookings = relationship("Booking", back_populates="centre")

class Crop(Base):
    __tablename__ = "crops"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    msp = Column(Float) # Minimum Support Price per quintal

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("users.id"))
    centre_id = Column(Integer, ForeignKey("procurement_centres.id"))
    crop_id = Column(Integer, ForeignKey("crops.id"))
    
    booking_date = Column(DateTime) # The date they are scheduled for
    quantity_expected = Column(Float) # Expected quantity in quintals
    quantity_actual = Column(Float, nullable=True) # Actual quantity after weighing
    
    status = Column(SQLAlchemyEnum(QueueStatus), default=QueueStatus.scheduled)
    payment_status = Column(SQLAlchemyEnum(PaymentStatus), default=PaymentStatus.pending)
    token_number = Column(String, unique=True, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    farmer = relationship("User", back_populates="bookings")
    centre = relationship("ProcurementCentre", back_populates="bookings")
    crop = relationship("Crop")
