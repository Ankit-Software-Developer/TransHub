# 🖥 TransporterTMS — Complete UI Screen Architecture & Visual Blueprint

This document specifies the exact screen layout, routing, module arrangement, and visual assets for all **9 core screens** of **TransporterTMS**, fully aligned with the production design system.

All screens are implemented as live interactive Next.js application routes in `frontend/app/`.

---

## 🗺 Complete Screen Arrangement & Routing Matrix

| Screen # | Module / Page | Route Path | Target Users | Key Capabilities |
|---|---|---|---|---|
| **01** | **Public Landing Page** | `/` | Public, Prospective Clients, Enterprise Leads | Hero, Live Dashboard Preview, Trust Metrics, Modules Grid, Control Tower Teaser |
| **02** | **Driver Mobile App (PWA)** | `/driver/dashboard` | Fleet Drivers, Transit Crew | Mobile HUD, Live Milestones, Speed/Fuel Telemetry, Camera POD, Receiver Signature |
| **03** | **Login & Authentication** | `/login` | All System Users, Branch Staff, Admins | Twilight Truck Hero, Cyber Glass Login Card, 1-Click Role Fill, SOC-2 Tag |
| **04** | **Load Planning & Warehouse** | `/load-planning` | Dispatch Managers, Warehouse Supervisors | 3D Cutaway Box Truck (Volume & Weight), Warehouse Floor Docks 1-4, Pallet Racks |
| **05** | **Real-Time Control Tower** | `/control-tower` | Transport Owners, 24x7 Operations Team | Interactive India GPS Map, Live Telemetry Card (72 km/h), Dispatch Queue, Exception Alerts |
| **06** | **Owner Operations Dashboard** | `/dashboard` | Transport Owners, Executive Directors | Revenue Sparklines, All-India Live Map Corridor, Action Center, Fleet Donut, Activity Feed |
| **07** | **Fleet & Vehicle Management** | `/fleet` | Fleet Managers, Maintenance Engineers | Vehicle List with Thumbnails, Compliance Trackers (Insurance/Fitness), Fuel Analytics |
| **08** | **Billing & Invoices / Finance** | `/billing/invoices` | Finance Managers, Accountants | Ageing Donut, Collections Trend Bar, GST Tax Breakdown, Invoice Table, Customer Ledger |
| **09** | **Bookings & Consignments** | `/bookings` | Booking Clerks, Branch Managers | 1,248 Bookings Table, Status Pills, 3-Step New Booking Drawer (Shipper, Consignee, Cargo) |

---

## 🌟 Detailed Screen Breakdown

---

### Screen 01: Front Public Landing Page
**Route:** `frontend/app/page.js`

#### Core Sections:
1. **Cyber-Glass Header:** Logo, Products, Solutions, Customers, Pricing, Resources, CTAs ("Start Free Trial", "Watch Demo").
2. **Hero Showcase:**
   - Badge: `⚡ ALL-IN-ONE TRANSPORT & LOGISTICS SAAS`
   - Headline: **"Move More. Deliver What's <span style="color:#00F0FF">Next</span>."**
   - Floating 3D frosted glassmorphic web dashboard preview showing live India fleet tracking (New Delhi ➔ Mumbai ➔ Nagpur), live active shipments (248), delivered today (192), and total revenue (₹28,45,230).
   - Long-haul modern prime mover transport truck driving on highway at dusk.
3. **Enterprise Trust & Metrics Bar:**
   - 10,000+ Deliveries | 2,500+ Active Trucks | 99.8% On-Time | 500+ Customers | 25+ Hubs | 4 Countries.
   - Client Logos: Delhivery, Tata, Mahindra Logistics, BlueStar, Ecom Express, Allcargo.
4. **"Everything You Need. In One Platform" Module Grid:**
   - Bookings, Dispatch, Live Tracking, Fleet Management, Invoicing, Analytics, Customer Portal, Integrations.
5. **Real-Time Control Tower Showcase:** Live vehicle tracking, exception alerts, and geofenced corridors.
6. **Mobile App Section ("Take TransHub On The Road"):** Floating driver and customer smartphone mockups.
7. **Stakeholder Personas:** Dedicated value props for Fleet Owners, Logistics Companies, Shippers, and Drivers.

---

### Screen 02: Driver Mobile App (PWA)
**Route:** `frontend/app/driver/dashboard/page.js`  
#### Core Features:
1. **Mobile Viewport Optimization:** Big-touch interface optimized for smartphone operation on highway routes.
2. **Current Trip Header:**
   - Route: `Delhi (DL · 110001) ➔ Mumbai (MH · 400070)`
   - Cargo: Electronics 20 Tons | Trip ID: `TRH-784521` | Vehicle: `MH12AB1234`
3. **Interactive GPS Corridor:** Highway tracking along NH48 near Vadodara, Gujarat with traffic overlays.
4. **4-Stage Milestone Stepper:**
   - Pickup (Delhi) ➔ In Transit (Vadodara) ➔ Out for Delivery (Mumbai) ➔ Delivered (Pending).
5. **Driver Telemetry Gauges:**
   - `620 km` Remaining | `8h 20m` ETA | `68 km/h` Current Speed | `78%` Fuel Level.
6. **One-Tap Driver Action Grid:**
   - 🧭 **Open Navigation:** Native Google Maps / GPS routing.
   - 📷 **Upload POD:** Instant camera capture of receiver-signed paper LR.
   - ✍️ **Delivery Confirmation:** Touchscreen receiver signature capture.
   - ⚠️ **Update Status:** Log border delays, toll halts, or mechanical issues.
7. **Bottom Tab Navigation:** Trip, Shipments, Messages, Support, More.

---

### Screen 03: Login & Authentication
**Route:** `frontend/app/(auth)/login/page.js`  
#### Core Features:
1. **Cinematic Split-Screen Layout:**
   - Left Side: Glowing highway prime mover transport truck with headline **"Log In to a Smarter, Faster Supply Chain"**, value tags (`Real-Time Visibility`, `Secure & Reliable`, `Built for Modern Logistics`), and trust metrics.
   - Right Side: Floating glowing cyber-glassmorphic login card with brand logo and "Welcome back".
2. **Authentication Controls:**
   - Clean email and password inputs with eye-toggle password reveal.
   - "Remember me" and "Forgot password?" links.
   - Radiant blue **"Log In ➔"** action button.
3. **One-Click Demo Role Selectors:**
   - Instant 1-click test credentials for Owner, Branch Manager, Booking Clerk, Accountant, and Super Admin.
4. **Enterprise Security Assurance:**
   - SOC 2 compliance tag and end-to-end encryption assurance banner.

---

### Screen 04: Load Planning & Warehouse Operations
**Route:** `frontend/app/(owner)/load-planning/page.js`  
#### Core Features:
1. **Executive Operational KPI Strip:**
   - Total Orders (248) | Loads to Plan (36) | Fleet Utilization (78% radial gauge) | Warehouse Capacity (62%) | On-Time Readiness (98.5%).
2. **Unplanned Consignments Queue:**
   - Staged shipments with priority badges (`Priority`, `Standard`, `Express`) for clients (Reliance Retail, Apollo Pharma, FreshMart).
3. **Interactive 3D Cutaway Vehicle Loading Visualizer:**
   - 16T Box Truck (`MH12 AB 4587`) with 3D color-coded cargo packages packed inside.
   - Live Volume Gauge: `14.2 / 16 m³` (89% utilization).
   - Live Weight Gauge: `8.6 / 10 t` (86% utilization).
   - Package Counter: `24 / 26` packages loaded.
4. **Interactive 3D Warehouse Floor Plan:**
   - Active Docks 1 to 4 with loading status (`Dock 1: Loading ORD-78452`, `Dock 2: Ready`, `Dock 3: In Progress`).
   - Warehouse storage zones (A1, A2, B2, C2) with pallet racking and forklift operations.
5. **Loading Sequence & Route Allocation:**
   - Step-by-step loading timeline (08:00 to 10:00).
   - Highway corridor route mapping (MH-DL-HR, MH-GJ-RJ, MH-KA-TN) with multi-stop optimization.

---

### Screen 05: Real-Time 24x7 Control Tower
**Route:** `frontend/app/(owner)/control-tower/page.js`  
#### Core Features:
1. **Live Operations Command Strip:**
   - Active Trips (248) | On-Time (192) | Delayed (36) | At Risk (12) | Shipments in Transit (2,500+) | Distance Covered (28,45,230 km) | Live IST Clock with pulsing green beacon.
2. **Interactive India Highway Map View:**
   - Multi-lane GPS tracking between New Delhi and Bengaluru with live truck marker `HR 55 AB 1234, 72 km/h, On Schedule`.
   - Map layers: Vehicles, Trips, Shipments, Geofences, Traffic, Weather.
3. **Live Vehicle Telemetry Panel:**
   - Prime Mover: `TATA Prima 5530.S 40 FT Container` (`HR 55 AB 1234`).
   - Driver: Amit Kumar (Rating 4.8★) with direct call/message triggers.
   - Route Metrics: `1,243 km` Distance Remaining | `11:30 AM` ETA | `+2h 15m` On-Time Buffer.
   - Milestone tracker: Booked ➔ Dispatched ➔ Picked Up ➔ In Transit ➔ Arriving ➔ Delivered.
4. **Live Dispatch Queue (24 Trips):**
   - High-density status table with trip ID, route, vehicle/driver, live status pills (`In Transit`, `Delayed`, `At Risk`, `Dispatched`), ETA, and GPS locate icon.
5. **Live Trip Event Timeline & Exception Center:**
   - Real-time highway events (Toll Crossed, Rest Stop, Picked Up).
   - High-priority exception alerts (Delay Risk, Route Deviation, Long Halt).
   - Operational insights (92% On-Time, 18h 24m Avg Transit, 4.2 km/L Fuel Efficiency).

---

### Screen 06: Owner Operations Dashboard
**Route:** `frontend/app/(owner)/dashboard/page.js`  
#### Core Features:
1. **Personalized Executive Greeting:**
   - *"Good Evening, Rohit! 👋 Here's what's happening with your logistics operations today."*
   - Live Weather and Time Widget: `Tue, 14 Jan 2025 07:24 PM | Gurugram, India 26°C Clear`.
2. **Top 6 Financial & Fleet KPIs:**
   - Total Revenue: ₹ 28,45,230 (+12% vs last month with sparkline).
   - Active Trips: 86 (+8% on the move).
   - Deliveries Completed: 192 (+14% Today).
   - Total Bookings: 248 (+10% This month).
   - Total Expenses: ₹ 8,12,400 (+6% This month).
   - On-Time Delivery: 98.4% (+2.1% Last 30 days).
3. **Interactive Live Trips India Map:**
   - Route vectors with vehicle hover callouts (`HR55AB1234: Delhi ➔ Mumbai, 320 km to go, ETA 16 Jan`).
   - Filter chips: All (86), In Transit (62), Loading (8), Unloading (7), Delayed (4).
4. **Action Center & Live Alerts:**
   - Swift quick actions: Create Booking, Assign Vehicle, Add Customer, Generate Report.
   - Alert notifications: Delay Alert (`MH12EF9012`), Low Fuel Alert, Maintenance Due.
5. **Fleet Status Donut & Pending Actions:**
   - 120 Total Vehicles (86 On Road, 18 Idle, 8 Under Maintenance, 8 Out of Service).
   - Pending action counter: Trips awaiting dispatch (6), PODs pending (3), Invoices pending (7).

---

### Screen 07: Fleet & Vehicle Management
**Route:** `frontend/app/(owner)/fleet/page.js` (or `/fleet/vehicles`)  
#### Core Features:
1. **Fleet Health & Utilization Strip:**
   - Total Vehicles (248) | Active on Road (192 - 77%) | In Yard (32) | Under Maintenance (16) | Inactive (8).
   - Utilization Donut (77%), Total Distance MTD (2,48,430 km), Fuel Consumption (68,430 L @ 4.8 km/L), Maintenance Cost (₹ 12,48,320).
2. **High-Density Vehicle Directory Table:**
   - Thumbnail previews with vehicle models (Tata Prima 5528 28T, Ashok Leyland 4220 22T, BharatBenz 2823 32T).
   - Live location with current speed (`Jaipur, RJ 68 km/h`).
   - Active Driver badge with photo and rating (Amit Kumar 4.8★).
   - Fuel level gauge (68%, 52%, 76%).
   - Document Expiry Countdowns: Insurance (`12 Nov 2025 - 32 days`), Fitness (`18 Jan 2026 - 99 days`), Pollution (`08 Dec 2025 - 58 days`).
3. **Driver Management & Maintenance Alerts:**
   - Active Driver roster with duty status (`On Duty`, `Available`, `Resting`).
   - Urgent Maintenance Alerts (Engine Oil Service due in 7 days, Brake Pad Replacement Overdue).
   - Fuel consumption vs mileage trend curve.

---

### Screen 08: Billing & Invoices / Finance
**Route:** `frontend/app/(owner)/billing/invoices/page.js`  
#### Core Features:
1. **Financial Overview KPIs:**
   - Total Invoiced: ₹ 2,84,52,300 (+12%).
   - Total Received: ₹ 2,18,40,700 (+15%).
   - Outstanding Balance: ₹ 66,11,600 (+8%).
   - Overdue Receivables: ₹ 23,48,900 (+22%).
   - Collection Efficiency: 76.8% with progress meter.
2. **Invoice Ageing & Tax Analytics:**
   - Ageing Donut: Current (₹ 42.6L), 1-30 Days (₹ 18.7L), 31-60 Days (₹ 12.4L), >60 Days (₹ 23.4L).
   - 6-Month Collections Trend Chart (Invoiced vs Received vs Outstanding).
   - GST Breakdown: CGST 9% (₹ 20.5L), SGST 9% (₹ 20.5L), IGST 18% (₹ 10.2L).
3. **Invoices Register Table:**
   - Customer branding logos (Reliance Retail, Flipkart Logistics, Amazon Seller, Tata Motors).
   - Invoice Dates, Due Dates, Total Amounts, Paid Amounts, and Remaining Balances.
   - Status pills: `Paid`, `Partially Paid`, `Overdue (7 days)`, `Sent`.
4. **Customer Ledger Card:**
   - Direct debit/credit statement of accounts for customer (e.g. Reliance Retail: Total Invoiced ₹ 12.48L, Received ₹ 9.12L, Outstanding ₹ 3.35L).

---

### Screen 09: Bookings & Consignments / Digital Bilty
**Route:** `frontend/app/(owner)/bookings/page.js`  
#### Core Features:
1. **Booking Volume KPI Strip:**
   - Total Bookings: 1,248 (+12%) | In Transit: 892 (+8%) | Delivered: 278 (+18%) | Delayed: 46 (+25%).
2. **Consignment Master Register Table:**
   - Dual identifiers: Booking ID & Consignment Number (`BKG-2024-0087 / CSN-8796543210`).
   - Customer name & industry segment (Reliance Retail, Tata Motors, Asian Paints).
   - Route path: Origin ➔ Destination (`DEL ➔ BLR`, `PUN ➔ DEL`, `MUM ➔ AHD`).
   - Cargo details: Package count, material type, and weight (`Electronics 48 Pkgs, 2,450 kg`).
   - Assigned vehicle: `KA01AB1234 32 ft Container`.
   - Colorful status pills: `In Transit`, `Delivered`, `Out for Delivery`, `Picked Up`, `Delayed`, `Pending`.
   - Freight amount (₹ 48,250, ₹ 1,12,600).
3. **Slide-Over "New Booking" Drawer:**
   - Stepper: `1. Booking Details` ➔ `2. Cargo & Charges` ➔ `3. Review & Confirm`.
   - Shipper (From) & Consignee (To) customer search selectors with saved addresses.
   - Route & Delivery Details (Pickup Date, Expected Delivery Date, Delivery Type, Priority).
   - Direct actions: "Save as Draft", "Next: Cargo & Charges ➔".

---

© 2026 TransporterTMS. All rights reserved. Built for Commercial Logistics Operations.
