#!/usr/bin/env python3
"""
Backend API Testing for CleanGrid Franchisee Application
Tests the POST /api/franchisee/apply endpoint with new businessNumber and taxNumber fields
"""

import asyncio
import httpx
import json
from datetime import datetime

# Backend URL - using localhost as configured in vite proxy
BACKEND_URL = "http://localhost:8001"

async def test_franchisee_application():
    """Test the franchisee application endpoint with new fields"""
    
    print("🧪 Testing Franchisee Application Endpoint")
    print("=" * 60)
    
    # Test data as specified in the review request
    test_data = {
        "legalName": "Test Corp Inc.",
        "legalType": "corporation",
        "operatingName": "Clean Stars Toronto",
        "businessNumber": "123456789RC0001",
        "taxNumber": "RT0001",
        "contactName": "John Smith",
        "email": "test-franchisee-newfields@test.com",
        "phone": "416-555-1234",
        "address": "123 Test Street",
        "city": "Toronto",
        "province": "ON",
        "postalCode": "M5V 1A1",
        "preferredFSAs": ["M5V", "M5W", "M5X"],
        "vehicleAccess": True,
        "experience": "5 years in commercial cleaning",
        "agreesToHRBank": True,
        "agreesToInsuranceMinimums": True
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            print(f"📤 Sending POST request to {BACKEND_URL}/api/franchisee/apply")
            print(f"📋 Test data: {json.dumps(test_data, indent=2)}")
            print()
            
            # Test 1: Submit application
            response = await client.post(
                f"{BACKEND_URL}/api/franchisee/apply",
                json=test_data,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"📊 Response Status: {response.status_code}")
            print(f"📄 Response Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                response_data = response.json()
                print(f"✅ SUCCESS: Application submitted successfully")
                print(f"📋 Response: {json.dumps(response_data, indent=2)}")
                
                # Verify response structure
                assert "success" in response_data, "Response missing 'success' field"
                assert response_data["success"] is True, "Success should be True"
                assert "data" in response_data, "Response missing 'data' field"
                assert "application_id" in response_data["data"], "Response missing 'application_id'"
                
                application_id = response_data["data"]["application_id"]
                print(f"🆔 Application ID: {application_id}")
                
                # Test 2: Retrieve application to verify data was saved
                print("\n" + "=" * 60)
                print(f"🔍 Testing GET /api/franchisee/application/{application_id}")
                
                get_response = await client.get(
                    f"{BACKEND_URL}/api/franchisee/application/{application_id}"
                )
                
                print(f"📊 GET Response Status: {get_response.status_code}")
                
                if get_response.status_code == 200:
                    get_data = get_response.json()
                    print(f"✅ SUCCESS: Application retrieved successfully")
                    print(f"📋 Retrieved data: {json.dumps(get_data, indent=2)}")
                    
                    # Verify the application was saved correctly
                    assert "success" in get_data, "GET response missing 'success' field"
                    assert get_data["success"] is True, "GET success should be True"
                    assert "data" in get_data, "GET response missing 'data' field"
                    
                    app_data = get_data["data"]
                    assert app_data["application_id"] == application_id, "Application ID mismatch"
                    assert app_data["operating_name"] == test_data["operatingName"], "Operating name mismatch"
                    assert app_data["status"] == "submitted", "Status should be 'submitted'"
                    
                    print(f"✅ All verifications passed!")
                    
                    return {
                        "success": True,
                        "application_id": application_id,
                        "status": "submitted",
                        "message": "Franchisee application endpoint working correctly with new fields"
                    }
                else:
                    print(f"❌ FAILED: GET request failed with status {get_response.status_code}")
                    print(f"📄 Error response: {get_response.text}")
                    return {
                        "success": False,
                        "error": f"GET request failed with status {get_response.status_code}",
                        "details": get_response.text
                    }
                    
            else:
                print(f"❌ FAILED: POST request failed with status {response.status_code}")
                print(f"📄 Error response: {response.text}")
                return {
                    "success": False,
                    "error": f"POST request failed with status {response.status_code}",
                    "details": response.text
                }
                
        except httpx.ConnectError as e:
            print(f"❌ CONNECTION ERROR: Could not connect to backend at {BACKEND_URL}")
            print(f"📄 Error details: {str(e)}")
            return {
                "success": False,
                "error": "Connection failed",
                "details": str(e)
            }
        except Exception as e:
            print(f"❌ UNEXPECTED ERROR: {str(e)}")
            return {
                "success": False,
                "error": "Unexpected error",
                "details": str(e)
            }

async def test_duplicate_email():
    """Test that duplicate email applications are rejected"""
    print("\n" + "=" * 60)
    print("🧪 Testing Duplicate Email Rejection")
    
    duplicate_data = {
        "legalName": "Another Corp Inc.",
        "legalType": "corporation", 
        "operatingName": "Clean Stars Ottawa",
        "businessNumber": "987654321RC0001",
        "taxNumber": "RT0002",
        "contactName": "Jane Doe",
        "email": "test-franchisee-newfields@test.com",  # Same email as before
        "phone": "613-555-5678",
        "address": "456 Another Street",
        "city": "Ottawa",
        "province": "ON",
        "postalCode": "K1A 0A1",
        "preferredFSAs": ["K1A"],
        "vehicleAccess": False,
        "experience": "3 years experience",
        "agreesToHRBank": True,
        "agreesToInsuranceMinimums": True
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{BACKEND_URL}/api/franchisee/apply",
                json=duplicate_data,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"📊 Response Status: {response.status_code}")
            
            if response.status_code == 400:
                response_data = response.json()
                print(f"✅ SUCCESS: Duplicate email correctly rejected")
                print(f"📋 Response: {json.dumps(response_data, indent=2)}")
                return {"success": True, "message": "Duplicate email validation working"}
            else:
                print(f"❌ FAILED: Expected 400 status for duplicate email, got {response.status_code}")
                print(f"📄 Response: {response.text}")
                return {"success": False, "error": f"Unexpected status {response.status_code}"}
                
        except Exception as e:
            print(f"❌ ERROR: {str(e)}")
            return {"success": False, "error": str(e)}

async def test_missing_required_fields():
    """Test that missing required fields are rejected"""
    print("\n" + "=" * 60)
    print("🧪 Testing Missing Required Fields Validation")
    
    incomplete_data = {
        "legalName": "Incomplete Corp",
        "legalType": "corporation",
        # Missing operatingName, contactName, email, etc.
        "businessNumber": "111222333RC0001",
        "taxNumber": "RT0003"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{BACKEND_URL}/api/franchisee/apply",
                json=incomplete_data,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"📊 Response Status: {response.status_code}")
            
            if response.status_code == 400:
                response_data = response.json()
                print(f"✅ SUCCESS: Missing fields correctly rejected")
                print(f"📋 Response: {json.dumps(response_data, indent=2)}")
                return {"success": True, "message": "Required field validation working"}
            else:
                print(f"❌ FAILED: Expected 400 status for missing fields, got {response.status_code}")
                print(f"📄 Response: {response.text}")
                return {"success": False, "error": f"Unexpected status {response.status_code}"}
                
        except Exception as e:
            print(f"❌ ERROR: {str(e)}")
            return {"success": False, "error": str(e)}

async def main():
    """Run all tests"""
    print("🚀 Starting Backend API Tests for Franchisee Application")
    print(f"🕐 Test started at: {datetime.now().isoformat()}")
    print()
    
    results = []
    
    # Test 1: Basic application submission with new fields
    result1 = await test_franchisee_application()
    results.append(("Franchisee Application", result1))
    
    # Test 2: Duplicate email rejection
    result2 = await test_duplicate_email()
    results.append(("Duplicate Email Validation", result2))
    
    # Test 3: Missing required fields
    result3 = await test_missing_required_fields()
    results.append(("Required Fields Validation", result3))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for test_name, result in results:
        if result["success"]:
            print(f"✅ {test_name}: PASSED")
            passed += 1
        else:
            print(f"❌ {test_name}: FAILED - {result.get('error', 'Unknown error')}")
            failed += 1
    
    print(f"\n📈 Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All tests passed! The franchisee application endpoint is working correctly.")
        return True
    else:
        print("⚠️  Some tests failed. Please check the errors above.")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)