# Neatify - Cleaning Services Booking Platform

**Professional cleaning services booking app for both commercial and residential clients across Canada with FSA-based franchisee routing and secure escrow payments.**

---

## 🎯 Overview

Neatify is a comprehensive mobile-first cleaning services platform that connects customers with local franchisees. The app features intelligent FSA (Forward Sortation Area) routing based on postal codes, instant quote generation, recurring booking options, and escrow payment protection.

### Key Features

#### For Customers
- 📱 Browse and book cleaning services (Regular, Deep Clean, Move In/Out, Commercial)
- 💰 Instant quote calculator with recurring discounts
- 📅 Easy scheduling with one-time and recurring options
- 🔒 Secure escrow payment protection
- ⭐ Review and rate service quality
- 📊 Track booking history and status

#### For Franchisees
- 💼 Dashboard with earnings tracking
- 📋 Job management (Accept, Start, Complete)
- 📍 FSA-based automatic job routing
- 💵 Real-time earnings calculations (80% revenue share)
- 📈 Performance metrics and analytics

#### For Admins
- 🛠️ Manage cleaning services and pricing
- 👥 Manage franchisees and FSA assignments
- 📊 Platform-wide analytics and statistics
- 💰 Revenue tracking and reporting
- 🗺️ FSA code management system

---

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Expo (React Native) - Cross-platform mobile app
- **Backend**: FastAPI (Python) - High-performance REST API
- **Database**: MongoDB - Document-based storage
- **Authentication**: JWT tokens with bcrypt password hashing
- **State Management**: Zustand
- **Navigation**: Expo Router (file-based routing)

### FSA Routing System
The app uses the last 3 characters of Canadian postal codes (e.g., "3A8" from "M5V 3A8") to route jobs to the appropriate franchisees. When a customer creates a booking:
1. System extracts FSA code from postal code
2. Finds franchisee assigned to that FSA
3. Auto-assigns job to franchisee
4. Franchisee receives job in their dashboard

---

## 🚀 Getting Started

### Database Seeding
The app comes with pre-seeded test data. If you need to reset the database:

\`\`\`bash
cd /app/backend
python seed_data.py
\`\`\`

### Test Accounts

#### Admin Account
- **Email**: admin@neatify.com
- **Password**: admin123
- **Access**: Full platform management, FSA assignment, service creation

#### Customer Account
- **Email**: customer@test.com
- **Password**: customer123
- **Address**: 123 Main Street, M5V3A8
- **Access**: Book services, view bookings, write reviews

#### Franchisee Account
- **Email**: franchisee@test.com
- **Password**: franchisee123
- **Assigned FSAs**: 3A8, 2B7, 1C6
- **Access**: View/manage jobs, track earnings

---

## 📱 App Structure

### Customer Flow
1. **Welcome Screen** → Choose to sign up as Customer or Franchisee
2. **Home Screen** → Browse available cleaning services
3. **Quote Calculator** → Get instant pricing based on:
   - Service type (Residential/Commercial)
   - Square footage
   - Recurring frequency (Weekly/Bi-weekly/Monthly with discounts)
4. **Booking Flow** → 
   - Enter address and postal code
   - Select service date
   - Add special instructions
   - Confirm payment (held in escrow)
5. **My Bookings** → Track upcoming and past bookings
6. **Booking Detail** → View status, cancel, or review completed jobs

### Franchisee Flow
1. **Dashboard** → View earnings, completed jobs, assigned FSAs
2. **Jobs List** → See all assigned jobs with status
3. **Job Management** → 
   - Start job (moves to in-progress)
   - Complete job (releases escrow payment)
4. **Earnings** → Track total earnings (80% of job value)

### Admin Flow
1. **Dashboard** → Platform statistics and revenue
2. **Services Management** → Create/edit cleaning services
3. **Franchisee Management** → Assign FSA codes to franchisees
4. **FSA Assignment** → Map postal code areas to franchisees

---

## 💳 Pricing & Payments

### Service Pricing Structure
Each service has:
- Base price (different for residential vs commercial)
- Price per square foot
- Estimated duration

### Recurring Discounts
- **Weekly**: 15% off
- **Bi-weekly**: 10% off
- **Monthly**: 5% off

### Escrow System
- Payment held securely when booking created
- Released to franchisee (80%) and company (20%) upon job completion
- Protects both customers and franchisees

---

## 🔐 Security Features

- **JWT Authentication**: Secure token-based auth with 30-day expiration
- **Password Hashing**: Bcrypt with automatic salt generation
- **Role-Based Access**: Separate permissions for customers, franchisees, and admins
- **Secure Storage**: AsyncStorage for local token persistence
- **API Protection**: Bearer token authentication on protected routes

---

## 🗺️ FSA (Forward Sortation Area) System

### What is an FSA?
FSAs are the first three characters of Canadian postal codes, but Neatify uses the **last 3 characters** for more granular routing within cities.

### How It Works
**Example**: Postal Code "M5V 3A8"
- First 3: M5V (general area)
- Last 3: 3A8 (specific sub-area) ← **Used for routing**

### FSA Assignment
Admins can assign multiple FSA codes to each franchisee:
1. Go to Admin → Franchisees
2. Select a franchisee
3. Add FSA codes (e.g., 3A8, 2B7, 1C6)
4. Jobs matching these FSAs auto-route to that franchisee

---

## 📊 Database Schema

### Collections

#### users
\`\`\`javascript
{
  _id: ObjectId,
  email: String,
  password: String (hashed),
  name: String,
  phone: String,
  role: "customer" | "franchisee" | "admin",
  address: String (customers only),
  postalCode: String (customers only),
  assignedFSAs: [String] (franchisees only),
  createdAt: DateTime
}
\`\`\`

#### services
\`\`\`javascript
{
  _id: ObjectId,
  name: String,
  category: String,
  serviceType: "residential" | "commercial" | "both",
  basePriceResidential: Number,
  basePriceCommercial: Number,
  pricePerSqFt: Number,
  description: String,
  estimatedDuration: Number (minutes),
  createdAt: DateTime
}
\`\`\`

#### bookings
\`\`\`javascript
{
  _id: ObjectId,
  customerId: String,
  franchiseeId: String,
  serviceId: String,
  serviceType: String,
  address: String,
  postalCode: String,
  fsaCode: String (last 3 chars),
  squareFeet: Number,
  scheduledDate: DateTime,
  isRecurring: Boolean,
  recurringFrequency: String,
  status: "pending" | "assigned" | "in-progress" | "completed" | "cancelled",
  escrowStatus: "held" | "released-to-franchisee",
  totalPrice: Number,
  notes: String,
  createdAt: DateTime,
  completedAt: DateTime
}
\`\`\`

#### reviews
\`\`\`javascript
{
  _id: ObjectId,
  customerId: String,
  bookingId: String,
  rating: Number (1-5),
  comment: String,
  createdAt: DateTime
}
\`\`\`

---

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Services
- `GET /api/services` - List all services
- `GET /api/services/{id}` - Get service details
- `POST /api/services` - Create service (admin only)

### Quotes
- `POST /api/quotes` - Calculate instant quote

### Bookings
- `GET /api/bookings` - List user bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/{id}` - Get booking details
- `PATCH /api/bookings/{id}/status` - Update booking status
- `DELETE /api/bookings/{id}` - Cancel booking

### Reviews
- `GET /api/reviews` - List all reviews
- `POST /api/reviews` - Create review (customers only)

### Admin
- `GET /api/admin/franchisees` - List franchisees
- `POST /api/admin/assign-fsa` - Assign FSA codes
- `GET /api/admin/stats` - Platform statistics

### Franchisee
- `GET /api/franchisee/earnings` - Get earnings data

---

## 🎨 Design System

### Colors
- **Primary**: `#10B981` (Green) - Main actions, highlights
- **Secondary**: `#3B82F6` (Blue) - Secondary actions
- **Error**: `#EF4444` (Red) - Errors, cancellations
- **Success**: `#10B981` (Green) - Completed states
- **Warning**: `#F59E0B` (Amber) - Pending states

### Components
- **Button**: Primary, Secondary, Outline variants with loading states
- **Input**: Text input with labels, errors, and validation
- **StatusBadge**: Color-coded status indicators
- **Cards**: Rounded corners with consistent padding

---

## 🔄 Booking Workflow

### Status Flow
1. **pending** - Booking created, waiting for franchisee assignment
2. **assigned** - Franchisee assigned based on FSA
3. **in-progress** - Franchisee started the job
4. **completed** - Job finished, payment released
5. **cancelled** - Booking cancelled by customer

### Escrow Flow
1. Customer creates booking → Payment **held** in escrow
2. Franchisee completes job → Payment **released**
   - 80% to franchisee
   - 20% to company
3. If cancelled before completion → Refund to customer (future feature)

---

## 📱 Mobile-First Design

### Key UX Principles
- **Touch-First**: Minimum 44px touch targets
- **Thumb-Friendly**: Bottom navigation for easy one-handed use
- **Safe Areas**: Proper handling of device notches and safe areas
- **Keyboard Handling**: KeyboardAvoidingView on all input screens
- **Loading States**: Clear feedback during async operations
- **Error Handling**: User-friendly error messages

### Navigation
- **Bottom Tabs**: Main navigation for each user type
- **Stack Navigation**: For nested flows (booking process)
- **Modal Navigation**: For focused tasks

---

## 🚢 Deployment & Production Readiness

### Environment Configuration
The app is configured for production with:
- Environment variables for API URLs
- Secure token storage
- Production-ready error handling

### Next Steps for Production
1. **Stripe Connect Integration**
   - Add Stripe API keys to backend `.env`
   - Connect franchisee Stripe accounts
   - Enable real payment processing

2. **Push Notifications**
   - Job assignments for franchisees
   - Booking confirmations for customers
   - Status updates

3. **Additional Features**
   - Real-time chat support
   - In-app calendar
   - Photo upload for before/after
   - GPS tracking during service

---

## 🛠️ Development

### Running Locally
Frontend is accessible at: `https://cleangrid-app.preview.emergentagent.com`
Backend API is running at: `http://localhost:8001`

### Testing
Use the pre-seeded test accounts to test different user roles and workflows.

### Resetting Data
Run the seed script again to reset all data:
\`\`\`bash
cd /app/backend && python seed_data.py
\`\`\`

---

## 📝 Notes

### Stripe Integration
The backend is ready for Stripe Connect integration. To enable:
1. Create a Stripe account
2. Get API keys (Secret Key, Publishable Key)
3. Add to backend `.env`:
   \`\`\`
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   \`\`\`
4. Uncomment payment processing code in `server.py`

### FSA Code Management
- FSA codes should always be 3 characters (alphanumeric)
- They are automatically extracted from postal codes
- Admin can assign multiple FSAs to one franchisee
- One FSA can only be assigned to one franchisee at a time (current implementation)

---

## 🎉 Summary

Neatify is a fully-functional cleaning services booking platform with:
- ✅ Multi-role authentication (Customer, Franchisee, Admin)
- ✅ Intelligent FSA-based job routing
- ✅ Instant quote calculator with discounts
- ✅ Escrow payment protection
- ✅ Comprehensive booking management
- ✅ Review system
- ✅ Real-time status updates
- ✅ Mobile-first responsive design
- ✅ Production-ready backend API

**Ready to launch with Stripe integration!** 🚀
