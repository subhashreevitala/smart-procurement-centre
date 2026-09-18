import os
from fastapi.testclient import TestClient
from main import app
from app.services.otp_service import DEMO_OTP

client = TestClient(app)

def test_sms_login_flow():
    print("\n--- Test 1: Requesting OTP for unregistered user (Login) ---")
    res = client.post("/auth/send-otp", json={"phone_number": "9123456789", "purpose": "login"})
    print("Status:", res.status_code, "Response:", res.json())
    assert res.status_code == 404

    print("\n--- Test 2: Requesting OTP for registered demo farmer (Login) ---")
    res = client.post("/auth/send-otp", json={"phone_number": "9876543210", "purpose": "login"})
    print("Status:", res.status_code, "Response:", res.json())
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    otp = data.get("dev_otp") or DEMO_OTP
    print("Retrieved OTP:", otp)

    print("\n--- Test 3: Verifying OTP with wrong code ---")
    res = client.post("/auth/verify-otp", json={"phone_number": "9876543210", "otp": "000000", "purpose": "login"})
    print("Status:", res.status_code, "Response:", res.json())
    assert res.status_code == 400

    print("\n--- Test 4: Verifying OTP with correct code ---")
    res = client.post("/auth/verify-otp", json={"phone_number": "9876543210", "otp": otp, "purpose": "login"})
    print("Status:", res.status_code, "Response:", res.json())
    assert res.status_code == 200
    token_data = res.json()
    assert "access_token" in token_data
    assert token_data["user"]["phone_number"] == "9876543210"

    print("\n--- Test 5: Farmer Registration Flow with OTP ---")
    new_phone = "9112233445"
    # 5a. Send OTP for register
    res = client.post("/auth/send-otp", json={"phone_number": new_phone, "purpose": "register"})
    print("Send OTP for Registration Status:", res.status_code, "Response:", res.json())
    assert res.status_code == 200
    reg_otp = res.json().get("dev_otp") or DEMO_OTP

    # 5b. Register with verified OTP
    reg_payload = {
        "phone_number": new_phone,
        "full_name": "Test Farmer",
        "otp": reg_otp,
        "aadhaar": "123456789012",
        "state": "Haryana",
        "district": "Karnal",
        "land_acres": 4.5
    }
    res = client.post("/auth/register", json=reg_payload)
    print("Register Status:", res.status_code, "Response:", res.json())
    assert res.status_code == 201
    assert res.json()["user"]["phone_number"] == new_phone

    print("\n--- Test 6: Access protected /auth/me endpoint ---")
    token = res.json()["access_token"]
    res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    print("Auth /me Status:", res.status_code, "Response:", res.json())
    assert res.status_code == 200
    assert res.json()["full_name"] == "Test Farmer"

    print("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<\n")

if __name__ == "__main__":
    test_sms_login_flow()
