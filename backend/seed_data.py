"""
Seed script to populate initial data for Neatify app
Run with: python seed_data.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_data():
    print("🌱 Starting data seeding for Neatify...")
    
    # Clear existing data
    print("\n📦 Clearing existing data...")
    await db.users.delete_many({})
    await db.services.delete_many({})
    await db.bookings.delete_many({})
    await db.reviews.delete_many({})
    
    # Create Admin User
    print("\n👤 Creating admin user...")
    admin_user = {
        "email": "admin@neatify.com",
        "password": pwd_context.hash("admin123"),
        "name": "Admin User",
        "phone": "(555) 000-0000",
        "role": "admin",
        "assignedFSAs": [],
        "createdAt": datetime.utcnow()
    }
    await db.users.insert_one(admin_user)
    print("✅ Admin created - Email: admin@neatify.com, Password: admin123")
    
    # Create Sample Customer
    print("\n👤 Creating sample customer...")
    customer_user = {
        "email": "customer@test.com",
        "password": pwd_context.hash("customer123"),
        "name": "John Doe",
        "phone": "(555) 111-1111",
        "role": "customer",
        "address": "123 Main Street",
        "postalCode": "M5V3A8",
        "assignedFSAs": [],
        "createdAt": datetime.utcnow()
    }
    await db.users.insert_one(customer_user)
    print("✅ Customer created - Email: customer@test.com, Password: customer123")
    
    # Create Sample Franchisee
    print("\n👤 Creating sample franchisee...")
    franchisee_user = {
        "email": "franchisee@test.com",
        "password": pwd_context.hash("franchisee123"),
        "name": "Clean Pro Services",
        "phone": "(555) 222-2222",
        "role": "franchisee",
        "assignedFSAs": ["3A8", "2B7", "1C6"],  # FSA codes they serve
        "createdAt": datetime.utcnow()
    }
    result = await db.users.insert_one(franchisee_user)
    franchisee_id = str(result.inserted_id)
    print("✅ Franchisee created - Email: franchisee@test.com, Password: franchisee123")
    print("   Assigned FSA Codes: 3A8, 2B7, 1C6")
    
    # Create Sample Workforce User
    print("\n👤 Creating sample workforce user...")
    workforce_user = {
        "email": "worker@test.com",
        "password": pwd_context.hash("worker123"),
        "name": "Mike Johnson",
        "phone": "(555) 333-3333",
        "role": "workforce",
        "assignedFSAs": [],
        "franchiseeId": franchisee_id,
        "createdAt": datetime.utcnow()
    }
    await db.users.insert_one(workforce_user)
    print("✅ Workforce created - Email: worker@test.com, Password: worker123")
    print(f"   Assigned to franchisee: {franchisee_id}")
    
    # Create Services
    print("\n🧹 Creating cleaning services...")
    
    services = [
        # RESIDENTIAL SERVICES (Budget → Premium)
        {
            "name": "Regular House Cleaning",
            "category": "regular",
            "serviceType": "residential",
            "basePriceResidential": 89.99,
            "basePriceCommercial": 0,
            "pricePerSqFt": 0.10,
            "description": "Standard home cleaning including dusting, vacuuming, mopping, and bathroom/kitchen cleaning",
            "estimatedDuration": 120,
            "isRecurringService": True,
            "createdAt": datetime.utcnow()
        },
        {
            "name": "Deep House Cleaning",
            "category": "deep-clean",
            "serviceType": "residential",
            "basePriceResidential": 179.99,
            "basePriceCommercial": 0,
            "pricePerSqFt": 0.20,
            "description": "Premium deep cleaning including baseboards, inside appliances, windows, and detailed cleaning of all areas",
            "estimatedDuration": 240,
            "isRecurringService": True,
            "createdAt": datetime.utcnow()
        },
        # COMMERCIAL SERVICES (Budget → Premium)
        {
            "name": "Regular Commercial Cleaning",
            "category": "commercial",
            "serviceType": "commercial",
            "basePriceResidential": 0,
            "basePriceCommercial": 149.99,
            "pricePerSqFt": 0.12,
            "description": "Standard office cleaning including workspaces, common areas, restrooms, and break rooms",
            "estimatedDuration": 150,
            "isRecurringService": True,
            "createdAt": datetime.utcnow()
        },
        {
            "name": "Deep Commercial Cleaning",
            "category": "commercial-deep",
            "serviceType": "commercial",
            "basePriceResidential": 0,
            "basePriceCommercial": 299.99,
            "pricePerSqFt": 0.22,
            "description": "Premium commercial cleaning with detailed sanitization, high-touch disinfection, and comprehensive workspace deep cleaning",
            "estimatedDuration": 240,
            "isRecurringService": True,
            "createdAt": datetime.utcnow()
        },
        # ONE-TIME SERVICES
        {
            "name": "Move In/Out Cleaning",
            "category": "move-in-out",
            "serviceType": "both",
            "basePriceResidential": 199.99,
            "basePriceCommercial": 349.99,
            "pricePerSqFt": 0.25,
            "description": "Complete cleaning for moving in or out, ensuring property is spotless for new occupants",
            "estimatedDuration": 300,
            "isRecurringService": False,
            "createdAt": datetime.utcnow()
        },
        {
            "name": "Post-Construction Cleaning",
            "category": "post-reno",
            "serviceType": "both",
            "basePriceResidential": 299.99,
            "basePriceCommercial": 499.99,
            "pricePerSqFt": 0.30,
            "description": "Specialized cleaning after construction or renovation to remove dust, debris, and prepare space for use",
            "estimatedDuration": 360,
            "isRecurringService": False,
            "createdAt": datetime.utcnow()
        }
    ]
    
    await db.services.insert_many(services)
    print(f"✅ {len(services)} services created successfully")
    
    print("\n" + "="*60)
    print("🎉 Data seeding completed successfully!")
    print("="*60)
    print("\n📝 Test Accounts:")
    print("\n   Admin:")
    print("   - Email: admin@neatify.com")
    print("   - Password: admin123")
    print("\n   Customer:")
    print("   - Email: customer@test.com")
    print("   - Password: customer123")
    print("\n   Franchisee:")
    print("   - Email: franchisee@test.com")
    print("   - Password: franchisee123")
    print("   - FSA Codes: 3A8, 2B7, 1C6")
    print("\n   Workforce:")
    print("   - Email: worker@test.com")
    print("   - Password: worker123")
    print(f"   - Works for franchisee ID: {franchisee_id}")
    print("\n" + "="*60)
    print("\n🚀 You can now log in to the app with these credentials!")
    
    # Close connection
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
