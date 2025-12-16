# Enhanced Quote Calculator with CleanUnits System

## Overview
The enhanced quote calculator provides **real-time, transparent pricing** using a professional CleanUnits (CU) system. Customers see live price updates as they fill the form, with complete breakdowns showing exactly what they're paying for.

---

## Key Features

### ✅ Fixed Price Display
- Instant price calculation as customer fills the form
- No guessing - exact price shown immediately
- Updates in real-time (500ms debounce)
- Complete line-item breakdown

### ✅ CleanUnits (CU) System
Professional cleaning industry standard that converts space and tasks into standardized units:

**Residential CU Values:**
- Bedrooms: 3 CU each
- Bathrooms: 5 CU each
- Kitchen: 6 CU
- Living Room: 4 CU each
- Dining Room: 2 CU each
- Stairs: 2 CU
- Hallways: 2 CU
- Laundry Room: 2 CU

**Commercial CU Values (per 500 sqft block):**
- Base area: 4 CU
- Washrooms: 6 CU each
- Kitchenette: 6 CU
- Floor services:
  - Vacuum/Mop: 2 CU
  - Machine Scrub: 6 CU
  - Buff/Polish: 8 CU
- Trash service:
  - Basic: 2 CU
  - Heavy: 5 CU
- High-touch disinfection: 3 CU per block

### ✅ Both Sqft AND Room Type Options
For commercial customers:
- **Option 1**: Simple sqft input (fast, easy)
- **Option 2**: Detailed room breakdown (more accurate)
- Customer chooses their preference

### ✅ Integrated Add-ons
Part of the quote flow with quantity controls:
- Fridge Interior: $35
- Oven Interior: $45
- Interior Windows: $6 per window
- Deep Baseboards: $60
- Carpet Spot Treatment: $40
- Haul Away Service: $90

---

## Pricing Formula

### Step 1: Calculate CleanUnits
Based on spaces and tasks selected

### Step 2: Base Calculation
```
Labor Subtotal = CU × CU Rate
Base Fee + Labor Subtotal = Subtotal
```

### Step 3: Apply Multipliers
```
Multiplier = Condition × Service Level × Time Window

Condition:
- Light: 1.0
- Normal: 1.15
- Heavy: 1.35

Service Level:
- Standard: 1.0
- Deep: 1.35
- Move In/Out: 1.75
- Post-Reno: 2.0

Time Window:
- Normal: 1.0
- After Hours: 1.15
- Same Day: 1.30
```

### Step 4: Add-ons
Add selected add-on services

### Step 5: Frequency Discount
```
- One Time: 0%
- Weekly: 15% off
- Bi-weekly: 10% off
- Monthly: 5% off
```

### Step 6: Tax
```
13% HST (Ontario default, configurable by region)
```

---

## Example Calculation

### Residential Deep Clean - Weekly Service

**Inputs:**
- 3 Bedrooms, 2 Bathrooms
- Kitchen, 1 Living Room, 1 Dining Room
- Stairs, Hallways
- Service Level: Deep
- Condition: Normal
- Frequency: Weekly
- Add-ons: Fridge ($35), Oven ($45)

**Calculation:**
```
1. CleanUnits:
   Bedrooms: 3 × 3 = 9 CU
   Bathrooms: 2 × 5 = 10 CU
   Kitchen: 6 CU
   Living Room: 4 CU
   Dining Room: 2 CU
   Stairs: 2 CU
   Hallways: 2 CU
   Total: 35 CU

2. Base Calculation:
   Base Fee: $35
   Labor: 35 CU × $8 = $280
   Subtotal: $315

3. Multiplier:
   1.15 (normal) × 1.35 (deep) × 1.0 (normal time) = 1.5525
   Labor with multiplier: $280 × 1.5525 = $434.70

4. Add-ons:
   Fridge: $35
   Oven: $45
   Total: $80

5. Subtotal: $549.70

6. Weekly Discount (15%): -$82.46

7. Total Before Tax: $467.24

8. Tax (13%): $60.74

9. Grand Total: $527.98
```

**Additional Info:**
- Estimated Hours: 9.06 hours
- Recommended Crew: 3 people
- Each crew member works ~3 hours

---

## Commercial Example

### Office Cleaning - 2000 sqft

**Inputs:**
- 2000 sqft
- 3 Washrooms
- Kitchenette
- Floor Service: Vacuum/Mop
- Trash: Basic
- High-Touch Disinfection: Yes
- Frequency: Weekly

**Calculation:**
```
1. CleanUnits:
   Blocks: ceil(2000 / 500) = 4 blocks
   Base area: 4 × 4 = 16 CU
   Washrooms: 3 × 6 = 18 CU
   Kitchenette: 6 CU
   Floor service: 4 × 2 = 8 CU
   Trash: 2 CU
   Disinfection: 4 × 3 = 12 CU
   Total: 62 CU

2. Base Calculation:
   Base Fee: $60
   Labor: 62 CU × $9 = $558
   Subtotal: $618

3. With multipliers and discount...
   Final: Calculated in real-time
```

---

## API Endpoints

### POST /api/quotes/enhanced
Calculate complete quote with CleanUnits

**Request:**
```json
{
  "job_type": "residential",
  "postal_code": "M5V3A8",
  "service_level": "deep",
  "condition": "normal",
  "frequency": "weekly",
  "time_window": "normal",
  "tax_rate": 0.13,
  "residential": {
    "bedrooms": 3,
    "bathrooms": 2,
    "kitchen": true,
    "living_rooms": 1,
    "dining_rooms": 1,
    "stairs": true,
    "hallways": true,
    "laundry_room": false
  },
  "add_ons": [
    {"id": "fridge_interior", "name": "Fridge Interior", "price": 35, "quantity": 1}
  ]
}
```

**Response:**
```json
{
  "job_type": "residential",
  "postal_code": "M5V3A8",
  "cu_total": 35,
  "multiplier": 1.5525,
  "base_fee": 35,
  "cu_rate": 8,
  "labor_subtotal": 280,
  "addons_total": 35,
  "frequency_discount_rate": 0.15,
  "discount_amount": 82.45,
  "total_before_tax": 467.25,
  "tax_rate": 0.13,
  "tax_amount": 60.74,
  "grand_total": 527.99,
  "estimated_hours": 9.06,
  "recommended_crew_size": 3,
  "line_items": [...]
}
```

### GET /api/quotes/addons
Get available add-on services

---

## UI/UX Features

### Real-Time Price Display
Large, prominent price card at the top showing:
- Grand total
- CleanUnits count
- Estimated hours
- Recommended crew size
- Savings badge (if recurring discount applies)

### Progressive Form
Customer builds their quote step by step:
1. Job Type (Residential/Commercial)
2. Location (Postal Code)
3. Service Level & Condition
4. Frequency (with discount preview)
5. Room/Area Details
6. Add-ons (with quantity controls)
7. Live Price Breakdown

### Visual Feedback
- Chip selection for categories
- Checkbox toggles for features
- Quantity steppers for add-ons
- Color-coded discounts (green)
- Detailed line-item breakdown

---

## Franchisee Benefits

### Dispatch Information
Each quote includes:
- **Estimated Hours**: How long the job will take
- **Recommended Crew Size**: Optimal team size
- **CleanUnits**: Industry-standard workload measurement

This helps franchisees:
- Schedule efficiently
- Assign appropriate crew
- Estimate completion time
- Price labor accurately

### Fair Pricing
CleanUnits ensure:
- Consistent pricing across franchisees
- Fair compensation for work required
- No under/over-bidding
- Professional industry standards

---

## Configuration

Pricing config stored in database (franchisee/zone level):

```python
base_fee_residential: 35
base_fee_commercial: 60
cu_rate_residential: 8
cu_rate_commercial: 9
cu_per_labor_hour: 6.0
max_hours_per_worker_per_job: 4.0
```

Easy to adjust for:
- Different cities
- Regional pricing
- Franchise territories
- Market rates

---

## Testing

**Test the calculator:**

1. Login as customer (customer@test.com / customer123)
2. Click "Get Live Quote" on home screen
3. Fill in details and watch price update in real-time
4. Try different combinations:
   - Residential vs Commercial
   - Different service levels
   - Weekly vs one-time
   - Add various add-ons
5. See complete breakdown at bottom

**API Testing:**
```bash
curl -X POST http://localhost:8001/api/quotes/enhanced \
  -H "Content-Type: application/json" \
  -d '{...}' | jq .
```

---

## Future Enhancements

1. **Room-Type Mode for Commercial**
   - Detailed breakdown: offices, conference rooms, reception
   - More accurate CU calculation
   - Better for complex layouts

2. **Photo Upload**
   - Customer uploads space photos
   - AI estimates sqft and condition
   - More accurate quotes

3. **Time Slot Selection**
   - Specific time preferences
   - Real-time availability
   - Instant scheduling

4. **Zone-Based Pricing**
   - Automatic config based on postal code
   - Regional adjustments
   - Franchise-specific rates

5. **Quote History**
   - Save and compare quotes
   - Convert saved quotes to bookings
   - Share quotes via email/SMS

---

## Summary

The enhanced calculator provides a **professional, transparent, real-time quoting experience** that:

✅ Shows exact prices immediately (no ranges, no surprises)
✅ Uses industry-standard CleanUnits system
✅ Offers both simple (sqft) and detailed (room-type) options
✅ Integrates add-ons seamlessly in the quote flow
✅ Provides complete price breakdowns
✅ Updates live as customer fills the form
✅ Helps franchisees with dispatch planning
✅ Ensures fair, consistent pricing across the platform

**The customer knows exactly what they're paying for before booking!**
