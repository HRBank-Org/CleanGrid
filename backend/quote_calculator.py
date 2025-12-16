"""
Enhanced Quote Calculator with CleanUnits (CU) system
Handles both residential and commercial pricing with real-time calculations
"""
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
import math

class PricingConfig(BaseModel):
    """Pricing configuration per city/zone"""
    # Base fees
    base_fee_residential: float = 35.0
    base_fee_commercial: float = 60.0
    
    # CU rates
    cu_rate_residential: float = 8.0
    cu_rate_commercial: float = 9.0
    
    # Multipliers
    condition_multipliers: Dict[str, float] = {
        "light": 1.0,
        "normal": 1.15,
        "heavy": 1.35
    }
    
    service_level_multipliers: Dict[str, float] = {
        "standard": 1.0,
        "deep": 1.35,
        "move_in_out": 1.75,
        "post_reno": 2.0
    }
    
    time_window_multipliers: Dict[str, float] = {
        "normal": 1.0,
        "after_hours": 1.15,
        "same_day": 1.30
    }
    
    frequency_discounts: Dict[str, float] = {
        "one_time": 0.0,
        "weekly": 0.15,
        "biweekly": 0.10,
        "monthly": 0.05
    }
    
    # Dispatch constants
    cu_per_labor_hour: float = 6.0
    max_hours_per_worker_per_job: float = 4.0

class ResidentialInput(BaseModel):
    """Residential cleaning inputs"""
    bedrooms: int = 0
    bathrooms: int = 0
    kitchen: bool = False
    living_rooms: int = 0
    dining_rooms: int = 0
    stairs: bool = False
    hallways: bool = False
    laundry_room: bool = False

class CommercialInput(BaseModel):
    """Commercial cleaning inputs"""
    # Sqft-based (simple)
    sqft: Optional[int] = None
    
    # Room-type based (advanced)
    area_units: Optional[List[Dict[str, Any]]] = None
    
    # Additional
    washrooms: int = 0
    kitchenette: bool = False
    floor_service: Optional[str] = None  # vacuum_mop, machine_scrub, buff_polish
    trash_service: str = "none"  # none, basic, heavy
    high_touch_disinfection: bool = False

class AddOn(BaseModel):
    """Add-on service"""
    id: str
    name: str
    price: float
    quantity: int = 1

class QuoteRequest(BaseModel):
    """Complete quote request"""
    # Common
    job_type: str  # residential, commercial
    postal_code: str
    city: Optional[str] = None
    service_level: str = "standard"
    condition: str = "normal"
    frequency: str = "one_time"
    time_window: str = "normal"
    tax_rate: float = 0.13
    
    # Type-specific
    residential: Optional[ResidentialInput] = None
    commercial: Optional[CommercialInput] = None
    
    # Add-ons
    add_ons: List[AddOn] = []

class LineItem(BaseModel):
    """Price breakdown line item"""
    label: str
    amount: float

class QuoteResponse(BaseModel):
    """Complete quote response"""
    job_type: str
    postal_code: str
    cu_total: float
    multiplier: float
    base_fee: float
    cu_rate: float
    labor_subtotal: float
    addons_total: float
    frequency_discount_rate: float
    discount_amount: float
    total_before_tax: float
    tax_rate: float
    tax_amount: float
    grand_total: float
    estimated_hours: float
    recommended_crew_size: int
    line_items: List[LineItem]

class QuoteCalculator:
    """Enhanced quote calculator with CleanUnits system"""
    
    def __init__(self, config: Optional[PricingConfig] = None):
        self.config = config or PricingConfig()
    
    def calculate_residential_cu(self, inputs: ResidentialInput) -> float:
        """Calculate CleanUnits for residential"""
        cu = 0.0
        cu += inputs.bedrooms * 3
        cu += inputs.bathrooms * 5
        cu += 6 if inputs.kitchen else 0
        cu += inputs.living_rooms * 4
        cu += inputs.dining_rooms * 2
        cu += 2 if inputs.stairs else 0
        cu += 2 if inputs.hallways else 0
        cu += 2 if inputs.laundry_room else 0
        return cu
    
    def calculate_commercial_cu(self, inputs: CommercialInput) -> float:
        """Calculate CleanUnits for commercial"""
        cu = 0.0
        
        if inputs.sqft:
            # Simple sqft-based calculation
            blocks = math.ceil(inputs.sqft / 500)
            
            # Base area
            cu += blocks * 4
            
            # Washrooms
            cu += inputs.washrooms * 6
            
            # Kitchenette
            cu += 6 if inputs.kitchenette else 0
            
            # Floor service
            if inputs.floor_service:
                floor_cu_map = {
                    "vacuum_mop": 2,
                    "machine_scrub": 6,
                    "buff_polish": 8
                }
                cu += blocks * floor_cu_map.get(inputs.floor_service, 0)
            
            # Trash service
            trash_cu_map = {
                "none": 0,
                "basic": 2,
                "heavy": 5
            }
            cu += trash_cu_map.get(inputs.trash_service, 0)
            
            # High-touch disinfection
            if inputs.high_touch_disinfection:
                cu += blocks * 3
        
        elif inputs.area_units:
            # Advanced room-type based (future enhancement)
            # For now, default to sqft calculation
            pass
        
        return cu
    
    def calculate_quote(self, request: QuoteRequest) -> QuoteResponse:
        """Calculate complete quote with line-item breakdown"""
        
        # Step 1: Calculate CleanUnits
        if request.job_type == "residential":
            if not request.residential:
                raise ValueError("Residential inputs required")
            cu_total = self.calculate_residential_cu(request.residential)
            base_fee = self.config.base_fee_residential
            cu_rate = self.config.cu_rate_residential
        else:  # commercial
            if not request.commercial:
                raise ValueError("Commercial inputs required")
            cu_total = self.calculate_commercial_cu(request.commercial)
            base_fee = self.config.base_fee_commercial
            cu_rate = self.config.cu_rate_commercial
        
        # Step 2: Calculate labor subtotal
        labor_subtotal = cu_total * cu_rate
        
        # Step 3: Calculate multiplier
        condition_mult = self.config.condition_multipliers.get(request.condition, 1.0)
        service_mult = self.config.service_level_multipliers.get(request.service_level, 1.0)
        time_mult = self.config.time_window_multipliers.get(request.time_window, 1.0)
        multiplier = condition_mult * service_mult * time_mult
        
        # Step 4: Calculate subtotal before add-ons
        labor_with_multiplier = labor_subtotal * multiplier
        subtotal_before_addons = base_fee + labor_with_multiplier
        
        # Step 5: Add-ons
        addons_total = sum(addon.price * addon.quantity for addon in request.add_ons)
        
        # Step 6: Subtotal with add-ons
        subtotal = subtotal_before_addons + addons_total
        
        # Step 7: Apply frequency discount
        frequency_discount_rate = self.config.frequency_discounts.get(request.frequency, 0.0)
        discount_amount = subtotal * frequency_discount_rate
        total_before_tax = subtotal - discount_amount
        
        # Step 8: Tax
        tax_amount = total_before_tax * request.tax_rate
        grand_total = total_before_tax + tax_amount
        
        # Step 9: Dispatch calculations
        estimated_hours = (cu_total / self.config.cu_per_labor_hour) * multiplier
        recommended_crew_size = max(1, min(6, math.ceil(estimated_hours / self.config.max_hours_per_worker_per_job)))
        
        # Step 10: Build line items
        line_items = [
            LineItem(label="Base visit fee", amount=round(base_fee, 2)),
            LineItem(
                label=f"Cleaning units ({int(cu_total)} CU × ${cu_rate})",
                amount=round(labor_subtotal, 2)
            ),
        ]
        
        if multiplier > 1.0:
            multiplier_amount = labor_with_multiplier - labor_subtotal
            line_items.append(
                LineItem(
                    label=f"Condition/service/time multiplier (×{multiplier:.4f})",
                    amount=round(multiplier_amount, 2)
                )
            )
        
        if addons_total > 0:
            for addon in request.add_ons:
                line_items.append(
                    LineItem(
                        label=f"{addon.name} {f'× {addon.quantity}' if addon.quantity > 1 else ''}",
                        amount=round(addon.price * addon.quantity, 2)
                    )
                )
        
        if discount_amount > 0:
            line_items.append(
                LineItem(
                    label=f"Frequency discount ({int(frequency_discount_rate * 100)}%)",
                    amount=round(-discount_amount, 2)
                )
            )
        
        line_items.append(
            LineItem(
                label=f"Tax ({int(request.tax_rate * 100)}%)",
                amount=round(tax_amount, 2)
            )
        )
        
        return QuoteResponse(
            job_type=request.job_type,
            postal_code=request.postal_code,
            cu_total=round(cu_total, 2),
            multiplier=round(multiplier, 4),
            base_fee=round(base_fee, 2),
            cu_rate=round(cu_rate, 2),
            labor_subtotal=round(labor_subtotal, 2),
            addons_total=round(addons_total, 2),
            frequency_discount_rate=round(frequency_discount_rate, 2),
            discount_amount=round(discount_amount, 2),
            total_before_tax=round(total_before_tax, 2),
            tax_rate=round(request.tax_rate, 2),
            tax_amount=round(tax_amount, 2),
            grand_total=round(grand_total, 2),
            estimated_hours=round(estimated_hours, 2),
            recommended_crew_size=recommended_crew_size,
            line_items=line_items
        )

# Available add-ons catalog
AVAILABLE_ADDONS = [
    {"id": "fridge_interior", "name": "Fridge Interior", "price": 35.0},
    {"id": "oven_interior", "name": "Oven Interior", "price": 45.0},
    {"id": "interior_windows", "name": "Interior Windows (per window)", "price": 6.0, "needs_quantity": True},
    {"id": "baseboards_deep", "name": "Deep Baseboards", "price": 60.0},
    {"id": "carpet_spot", "name": "Carpet Spot Treatment", "price": 40.0},
    {"id": "haul_away", "name": "Haul Away Service", "price": 90.0},
]
