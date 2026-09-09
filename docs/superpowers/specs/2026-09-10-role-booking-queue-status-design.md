# AHS Role, Commission, Product Status, and Booking Queue Design

## Goal

Align the AHS BDS system with the approved role rules, canonical product labels, and sequential booking matching turns.

## Scope

- `SALES_ADMIN` enters or updates `DoanhThu`, `HoaHong`, and `TrangThaiHoaHong`.
- `MANAGER` can view those values and the company revenue report, but cannot edit those three fields.
- `SALES` can view commission data only for contracts they own. `PRODUCT_ADMIN` does not receive revenue or commission data.
- `PRODUCT_ADMIN` sees only `Dự án và sản phẩm` and the project product-sales report.
- Product labels shown on the website are exactly `Còn hàng`, `Đang lock`, and `Đã bán`.
- Confirming a booking transaction schedules the next booking turn; it does not immediately match a unit.

## Current Problems

- Contract and report code fills missing company revenue and commission with percentage-based fallback values.
- The contract modal treats `MANAGER` as a Sales Admin for edit controls.
- Product-admin report navigation can open the restricted revenue tab and dereference a null summary.
- Legacy product labels such as `Check Admin`, `Đang giữ chỗ`, `Đã cọc`, and `Đã khớp` leak into the website.
- Booking approval rewrites the current booking's matching window instead of creating the next sequential booking turn.
- Booking matching can proceed without an explicit transaction-confirmed marker.

## Design

### Permissions and contract data

Keep the existing `commissionStatus` field as the persisted value for `TrangThaiHoaHong`; do not add a duplicate status column. Add a shared role-policy helper used by contract and report routes. API responses sanitize company revenue for every role except `MANAGER` and sanitize commission fields to the manager, Sales Admin, or owning Sales employee. Contract writes accept the three financial fields only from `SALES_ADMIN`; Manager remains read-only. Sales-created contracts leave `doanhthu` and `hoahong` unset until Sales Admin enters them. Remove all 5%/3% fallback writes and report calculations.

### Product status

Add one canonical display mapping from persisted status to Vietnamese labels. Persist the canonical label whenever a product transition writes status, and normalize legacy values in read responses and UI rendering. The business state machine remains `AVAILABLE -> LOCKED -> DEPOSITED/SOLD`, with `DEPOSITED` displayed as `Đã bán`.

### Booking queue

Add transaction-confirmation metadata to `Booking` so approval is idempotent. The approval endpoint accepts only a booking awaiting deposit confirmation. In one transaction it:

1. marks the current booking as transaction-confirmed while keeping it in `CHO_KHOP`;
2. calculates the next `sttBooking` in the project;
3. creates the next booking row with a start equal to the current turn's end and an end ten minutes later;
4. links the created follow-up row to the confirmed booking so retries cannot create duplicates.

The newly created row remains waiting and does not change any product status. The match-unit endpoint requires confirmation metadata and the scheduled time window before moving a product to `SOLD` and a booking to `DA_KHOP`.

### UI

Use role-specific menu and report-tab allowlists. Product Admin opens directly on the project product-sales report and cannot see company revenue, employee-sales, or KPI tabs. Sales Admin has no company report menu. In the contract modal, Sales Admin receives inputs for the three fields, Manager sees read-only values, and Sales sees only permitted own-commission values. Rename the status label to `Trạng Thái Hoa Hồng [TrangThaiHoaHong]`.

## Error handling

- Unauthorized financial-field writes return HTTP 403 with a role-specific message.
- Duplicate booking approval returns the existing follow-up booking without creating another row.
- Matching before confirmation or before the assigned window returns HTTP 409/400 with the assigned time.
- Invalid or missing schedule data is rejected instead of silently starting a ten-minute window at the current time.

## Testing

- Unit tests for role policy, canonical product labels, and next-turn time calculation.
- Route tests for financial-field permissions, removal of fallback values, idempotent booking approval, and matching guards.
- UI/build checks for role-specific navigation and TypeScript compilation.
- Preserve unrelated dirty changes and verify the final diff is limited to this behavior.
