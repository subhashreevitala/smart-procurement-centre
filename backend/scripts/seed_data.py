import sys
import os
from datetime import datetime, timedelta
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from faker import Faker
import random
from app.database import SessionLocal, engine
from app.models import Base, User, ProcurementCentre, Crop, Booking, Role, QueueStatus, PaymentStatus

fake = Faker('en_IN') # Indian locale for names/locations

def seed():
    # Recreate DB tables
    print("Dropping existing tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    print("Seeding crops...")
    crops = [
        Crop(name="Wheat", msp=2275.0),
        Crop(name="Paddy (Common)", msp=2183.0),
        Crop(name="Paddy (Grade A)", msp=2203.0),
        Crop(name="Cotton", msp=6620.0),
        Crop(name="Mustard", msp=5650.0),
    ]
    db.add_all(crops)
    db.commit()

    print("Seeding Procurement Centres...")
    centres = []
    centre_data = [
        ("APMC Mandi Karnal", "Karnal, Haryana", 1500),
        ("APMC Mandi Kurukshetra", "Kurukshetra, Haryana", 1200),
        ("APMC Mandi Ambala", "Ambala, Haryana", 1000),
        ("APMC Mandi Ludhiana", "Ludhiana, Punjab", 2000),
        ("APMC Mandi Patiala", "Patiala, Punjab", 1800),
        ("APMC Mandi Moga", "Moga, Punjab", 1400)
    ]
    for name, loc, cap in centre_data:
        centre = ProcurementCentre(
            name=name,
            location=loc,
            capacity_per_day=cap
        )
        centres.append(centre)
    db.add_all(centres)
    db.commit()

    print("Seeding Admin Users...")
    admin = User(
        phone_number="9999999999",
        full_name="System Administrator (DoCA)",
        role=Role.admin
    )
    db.add(admin)

    print("Seeding Demo Farmers...")
    demo_farmers = [
        User(phone_number="9876543210", full_name="Ramesh Kumar", role=Role.farmer),
        User(phone_number="9876543211", full_name="Suresh Patel", role=Role.farmer),
        User(phone_number="9876543212", full_name="Harpreet Singh", role=Role.farmer),
    ]
    db.add_all(demo_farmers)

    for _ in range(15):
        farmer = User(
            phone_number=fake.phone_number().replace(" ", "").replace("+91", "")[-10:],
            full_name=fake.name(),
            role=Role.farmer
        )
        db.add(farmer)
    db.commit()

    print("Seeding Initial Bookings...")
    all_farmers = db.query(User).filter(User.role == Role.farmer).all()
    all_centres = db.query(ProcurementCentre).all()
    all_crops = db.query(Crop).all()

    statuses = [
        (QueueStatus.checked_in, PaymentStatus.pending),
        (QueueStatus.weighing, PaymentStatus.pending),
        (QueueStatus.quality_check, PaymentStatus.processing),
        (QueueStatus.completed, PaymentStatus.completed),
        (QueueStatus.scheduled, PaymentStatus.pending),
        (QueueStatus.scheduled, PaymentStatus.pending),
    ]

    for i, (q_status, p_status) in enumerate(statuses):
        farmer = all_farmers[i % len(all_farmers)]
        centre = all_centres[0] # Mandi Karnal
        crop = all_crops[i % len(all_crops)]
        
        token = f"TKN-{1000 + i}"
        booking = Booking(
            farmer_id=farmer.id,
            centre_id=centre.id,
            crop_id=crop.id,
            booking_date=datetime.utcnow() + timedelta(days=0),
            quantity_expected=float(random.randint(25, 80)),
            quantity_actual=float(random.randint(25, 80)) if q_status in [QueueStatus.weighing, QueueStatus.quality_check, QueueStatus.completed] else None,
            status=q_status,
            payment_status=p_status,
            token_number=token
        )
        db.add(booking)
    db.commit()
    
    print("Seed complete! Database populated with admin, farmers, centres, crops, and live bookings.")

if __name__ == "__main__":
    seed()
