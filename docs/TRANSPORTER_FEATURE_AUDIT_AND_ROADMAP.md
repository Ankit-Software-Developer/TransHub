# TransHub - Transporter TMS Feature Audit & Development Roadmap

**Document Version:** 1.0.0  
**Last Updated:** October 2026  
**Target Platform:** Indian Road Logistics, Fleet Transport Operations & Multi-Tenant SaaS TMS

---

## 1. Executive Summary & Market Positioning

This document provides a comparative analysis of **TransHub** against leading commercial Transport Management Systems (TMS) in the Indian and global logistics landscape (e.g., **TransportSimple, Fleetx, WheelsEye, Shipway, FreightFox, and Tally Logistics**).

TransHub is already equipped with advanced enterprise features that surpass most competitors (such as a **3D Truck Volumetric Load Planning engine**, **Camera-based Proof of Delivery with OTP/Signatures**, **Multi-Branch RBAC**, and **Multi-Tier Approvals**).

This document serves as the permanent record of:
1. **Modules Built & Operational** (Completed)
2. **Immediate High-Priority Features** (Reports Section & Hierarchical Support Section)
3. **Medium-Priority Commercial Enhancements** (Consolidated Invoicing & Trip Settlement)
4. **Future Roadmap** (Government API integrations, Market Vehicle LHC, WhatsApp Webhooks)

---

## 2. Comprehensive Feature Comparison Matrix

| # | Logistics Lifecycle Domain | Industry Standard Transporter TMS Requirement | TransHub Implementation Status | Status | Priority |
|---|---|---|---|:---:|:---:|
| **1** | **Multi-Tenancy & Access Control** | Multi-branch data isolation, role-based access (Owner, Admin, Branch Mgr, Operator, Accountant) | Full SaaS multi-tenancy, JWT auth, dynamic RBAC, branch switcher with network permissions | ✅ Complete | Done |
| **2** | **Master Data Management** | Branches/Hubs, Customers (Consignor/Consignee), Fleet (Vehicles, RC/Fitness/Insurance), Drivers, Staff | Complete CRUD, document expiry alerts, customer address books | ✅ Complete | Done |
| **3** | **Docket / Bilty (LR) Management** | LR generation, weight calculation (Actual vs Charged), package types, extra charges, print LR with barcode | Dynamic booking engine, auto-rate calculation, print bilty with barcode & QR | ✅ Complete | Done |
| **4** | **3D Load Planning & Manifest** | Volumetric load planning, weight distribution, loading sheet generation | Advanced 3D truck simulation viewer, packing algorithm, dispatch manifests | ✅ Complete | Done |
| **5** | **Trip Management & En-Route Advances** | Line-haul trips, vehicle allocation, driver advances, diesel slips | Trip tracking, driver advance records, fuel entries, maintenance logs | ✅ Complete | Done |
| **6** | **Unload Planning & Inward Tally** | Shortage, excess, and damage verification at destination hub | Unload planning module with tally checks & damage claims | ✅ Complete | Done |
| **7** | **Delivery & Proof of Delivery (POD)** | Local Delivery Run Sheet (DRS), OTP/Sign confirmation, camera POD upload | Comprehensive Delivery page (3,000+ lines), live camera capture, POD audit | ✅ Complete | Done |
| **8** | **Approvals & Governance** | Multi-level approval hierarchy for expenses, discounts, cancellations | `ApprovalRequest` system with role escalation & pending badges | ✅ Complete | Done |
| **9** | **Audit Trail & System Logs** | Immutable event logs for bilty edits, deletions, cancellations | Comprehensive `AuditLog` module with timeline visualization | ✅ Complete | Done |
| **10** | **Public Consignment Tracking** | Public tracking link for consignors/consignees via docket number | Implemented (`/track`) with milestone timeline | ✅ Complete | Done |
| **11** | **Driver Mobile Portal** | Mobile-friendly view for drivers to view assigned trips and advances | Dedicated driver interface (`/driver`) | ✅ Complete | Done |
| **12** | **Reports & Operational Analytics** | Docket register, Customer ageing, Trip P&L, POD compliance, Branch cash register, GST (SAC 9965) | Currently **Placeholder** (4 static cards with alert boxes) | ⏳ **PENDING** | **HIGH** |
| **13** | **Hierarchical Support & Helpdesk** | Branch Staff $\rightarrow$ Transporter Admin $\rightarrow$ Super Admin ticket escalation | Not built yet (No ticket model or interface) | ⏳ **PENDING** | **HIGH** |
| **14** | **Trip Settlement (Trip P&L Closing)** | One-click trip closing: Revenue loaded $-$ (Diesel + Fastag + Advances + Tolls) $=$ Profit | Schema exists (`TripSettlement`), but automated closing UI can be streamlined | ⚠️ **PARTIAL** | **MEDIUM** |
| **15** | **Consolidated Monthly Invoicing** | Grouping 50+ delivered dockets for a corporate party into one monthly GST invoice | Single invoice generation active; batch docket consolidation needed | ⚠️ **PARTIAL** | **MEDIUM** |
| **16** | **Branch Cash & Bank Reconciliation** | Hub cash register: To-Pay cash collected on delivery vs bank remittance | Recorded in payments, but dedicated branch cash day-book is pending | ⏳ **PENDING** | **MEDIUM** |
| **17** | **Market / Hired Vehicle (LHC) Module** | Managing outside/broker trucks, Lorry Hire Challan, TDS 194C deduction | Own fleet is complete; market truck hire flow is basic | ⏳ **FUTURE** | **LOW** |
| **18** | **Government APIs (E-Way Bill & Vahan)** | Auto-fetching bill details from NIC E-Way Bill portal and RC details from Vahan | Manual entry currently; direct GSP/NIC API integration pending | ⏳ **FUTURE** | **LOW** |

---

## 3. Immediate Implementation Plan: Reports & Analytics Section

### 3.1 Overview
Transporter owners and managers require six essential registers to operate commercially, reconcile payments, and maintain tax compliance.

### 3.2 The 6 Transporter Registers

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          GLOBAL FILTERS & CONTROL TOOLBAR                              │
│  [Date Range: 1-Click / Custom]  [Branch: All Hubs]  [Customer]  [Payment Type]  [Search]   │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
       ┌───────────────────┬────────────────┴──────────────────┬───────────────────┐
       ▼                   ▼                                   ▼                   ▼
┌──────────────┐    ┌──────────────┐                    ┌──────────────┐    ┌──────────────┐
│ 1. Dockets & │    │ 2. Customer  │                    │ 3. Line-Haul │    │ 4. POD & TAT │
│ Freight Reg  │    │ Outstanding  │                    │ Trip P&L Reg │    │  Compliance  │
└──────────────┘    └──────────────┘                    └──────────────┘    └──────────────┘
       │                   │                                   │                   │
       ▼                   ▼                                   ▼                   ▼
┌──────────────┐    ┌──────────────┐                    ┌──────────────┐    ┌──────────────┐
│ 5. Branch    │    │ 6. GST & Tax │                    │ Live Summary │    │ Multi-Export │
│ Daily Cash   │    │ (SAC 9965)   │                    │ Metrics Bar  │    │ CSV/XLS/Print│
└──────────────┘    └──────────────┘                    └──────────────┘    └──────────────┘
```

1. **Docket & Freight Sales Register (Consignment Register)**
   - **Purpose:** Full audit log of all booked shipments.
   - **Columns:** Booking Date, Docket / Bilty No, Origin Branch, Destination Hub, Consignor, Consignee, Package Count, Actual Wt, Charged Wt, Base Freight, Hamali/Loading, Statistical, Door Delivery, Total Freight, Payment Mode (`PAID`, `TO-PAY`, `TBB`), Invoice Status (`BILLED`/`UNBILLED`), Delivery Status.
   - **Summary Metrics:** Total Bookings, Total Weight (Tonnes), Total Revenue (₹).

2. **Customer Outstanding & Ageing Report (Credit / TBB Receivables)**
   - **Purpose:** Monitor unpaid party balances and aging credit.
   - **Columns:** Customer Name, Phone/Email, GSTIN, Total Dockets, Total Invoiced (₹), Paid (₹), Outstanding Balance (₹), **Ageing Buckets** (0–30 Days, 31–60 Days, 61–90 Days, 90+ Days Overdue), Credit Limit & Overdue Indicator.
   - **Summary Metrics:** Total Receivables, Total Overdue (>60 Days).

3. **Line-Haul Trip & Vehicle Profitability Register (Trip P&L)**
   - **Purpose:** Audit trip profitability and vehicle unit economics.
   - **Columns:** Trip No / Challan, Vehicle No, Driver, Origin $\rightarrow$ Destination, Distance (KM), Total Freight Loaded (₹), Diesel Cost (₹), FASTag Tolls (₹), Driver Advance / Bhatta (₹), En-route Expenses (₹), Total Expenses (₹), **Net Trip Margin (₹)**, Margin %.
   - **Summary Metrics:** Total Vehicle Revenue, Total Operating Expense, Net Transporter Margin.

4. **Proof of Delivery (POD) Compliance & TAT Register**
   - **Purpose:** SLA tracking and proof-of-delivery turnaround times.
   - **Columns:** Docket No, Consignee, Origin, Destination, Booking Date, Delivery Date, Transit TAT (Days), POD Status (`PENDING`, `UPLOADED`, `VERIFIED`, `REJECTED`), Physical POD Copy Status.
   - **Summary Metrics:** On-Time Delivery Rate (%), Pending POD Count, Verified POD %.

5. **Daily Branch Cash & Collection Register**
   - **Purpose:** Hub-level cash auditing to prevent cash leakage.
   - **Columns:** Date, Branch Name, Cash Collected (Paid Bookings), Cash Collected (To-Pay Deliveries), Booking Advances, Total Cash In-Hand, Bank Remittance Reference, Deposit Slip Status.
   - **Summary Metrics:** Total Cash In-Hand Across Hubs, Remitted to Bank, Unremitted Balance.

6. **GST & Output Tax Register (SAC Code 9965)**
   - **Purpose:** Monthly filing for GSTR-1 and tax liability audits.
   - **Columns:** Invoice / Docket No, Date, Consignor GSTIN, Consignee GSTIN, Taxable Freight, Tax Type (`RCM` vs `Forward Charge`), CGST (2.5% / 6%), SGST (2.5% / 6%), IGST (5% / 12%), Total GST Payable.
   - **Summary Metrics:** Total Taxable Turnover, Total CGST/SGST/IGST, RCM Turnover.

### 3.3 UI Features & Export Engine
- Dynamic Date Filters: *Today, Yesterday, This Week, This Month, Last Month, Custom Date Range*.
- Multi-Branch Selector: Filter by individual branch or view consolidated enterprise data.
- Export Formats: **Instant CSV Export**, **Excel (XLSX) Compatible Export**, and **Print / PDF Clean View**.

---

## 4. Immediate Implementation Plan: Hierarchical Support Section

### 4.1 Child-to-Parent Escalation Workflow

```
┌────────────────────────────────────────────────────────┐
│                     LEVEL 1: BRANCH                    │
│   Branch Manager / Hub Operator raises issue / ticket   │
│   e.g. "Printer failure", "Rate discount request", "Bug"│
└───────────────────────────┬────────────────────────────┘
                            │
                            │ Creates Ticket (Assigned to Transporter Admin)
                            ▼
┌────────────────────────────────────────────────────────┐
│              LEVEL 2: TRANSPORTER ADMIN                │
│   Tenant Owner / Org Admin manages all branch tickets  │
│                                                        │
│   • Can reply, attach files, mark IN_PROGRESS/RESOLVED  │
│   • IF UNRESOLVED: Clicks "Escalate to Super Admin"    │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ Escalates Ticket (Platform level issue)
                            ▼
┌────────────────────────────────────────────────────────┐
│                 LEVEL 3: SUPER ADMIN                   │
│   Platform Super Admin receives escalated tickets      │
│   across all tenant transporters to solve system/plan  │
│   issues and provide platform-level resolution         │
└────────────────────────────────────────────────────────┘
```

### 4.2 Data Models & Schema Design

#### `Ticket` Model
- `id`: UUID (Primary Key)
- `ticket_number`: String (e.g. `TKT-2026-0042`)
- `tenant_id`: UUID (Transporter organization)
- `branch_id`: UUID (Originating branch)
- `created_by`: UUID (Branch staff / manager)
- `assigned_role`: ENUM (`ADMIN`, `SUPER_ADMIN`)
- `escalation_level`: ENUM (`BRANCH_TO_ADMIN`, `ADMIN_TO_SUPERADMIN`)
- `is_escalated`: Boolean (Default: false)
- `escalated_by`: UUID (Transporter Admin user ID)
- `escalation_reason`: Text (Reason provided by Transporter Admin)
- `category`: ENUM (`OPERATIONAL`, `BILLING_RATES`, `DOCKET_POD`, `HARDWARE_PRINTER`, `SOFTWARE_BUG`, `FINANCE_ACCOUNTS`, `OTHER`)
- `priority`: ENUM (`LOW`, `NORMAL`, `HIGH`, `URGENT`)
- `status`: ENUM (`OPEN`, `IN_PROGRESS`, `ESCALATED`, `RESOLVED`, `CLOSED`)
- `subject`: String(255)
- `description`: Text
- `reference_code`: String(50) (Optional Docket / Trip / Invoice #)
- `resolved_by`: UUID
- `resolved_at`: Timestamp
- `resolution_notes`: Text

#### `TicketMessage` Model
- `id`: UUID (Primary Key)
- `ticket_id`: UUID (Foreign Key to `Ticket`)
- `sender_id`: UUID (User ID)
- `sender_role`: String (`BRANCH_MANAGER`, `ADMIN`, `SUPER_ADMIN`)
- `message`: Text
- `attachment_url`: String (optional)
- `is_internal_note`: Boolean (Internal admin remarks)
- `created_at`: Timestamp

### 4.3 UI Portal Experience
1. **Sidebar Navigation**: Dedicated **"Support & Helpdesk"** menu item with live badge count for open tickets.
2. **Ticket List & Filter Bar**: Filter by status (`OPEN`, `ESCALATED`, `RESOLVED`), priority, and branch.
3. **"New Ticket" Modal**: Category selection, priority, optional docket/trip reference tag, description, and attachments.
4. **Interactive Ticket Drawer**:
   - Visual status lifecycle badge.
   - Message timeline with chat-style bubbles for Branch Staff, Transporter Admin, and Super Admin.
   - **"Escalate to Super Admin"** button for Transporter Admins with escalation confirmation dialog.
   - **"Mark as Resolved"** action with resolution notes.

---

## 5. Secondary Enhancements (Future Phases)

1. **Consolidated Monthly Invoicing (Batch Docket Billing)**:
   - Ability to select 10–100 delivered TBB dockets for a corporate client and generate a consolidated GST Tax Invoice in one click.
2. **Automated Trip Settlement (P&L Closure)**:
   - Settlement dashboard linking Trip Revenue $-$ (Diesel + Fastag Tolls + Driver Advance + Hamali) $=$ Final Net Profit to Fleet Owner.
3. **Branch Petty Cash Day-Book**:
   - Daily opening balance, To-Pay cash receipts, Paid cash receipts, local petty expenses, bank remittance slip upload, closing balance.
4. **Third-Party API Integrations**:
   - **NIC E-Way Bill Portal**: Auto-fill bilty from E-Way Bill Number.
   - **Vahan API**: Auto-fill vehicle make, model, chassis, and pollution expiry from vehicle registration number.
   - **WhatsApp Cloud API**: Automated bilty booking and delivery alerts sent to consignor and consignee phones.

---

*This document is stored in the project repository at `docs/TRANSPORTER_FEATURE_AUDIT_AND_ROADMAP.md`.*
