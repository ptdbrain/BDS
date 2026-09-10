# AHS Document Gap Completion

## Scope

The Google Doc is a chronological requirement log. The latest tab 8 rules and the already-approved role/booking decisions are authoritative when older entries conflict.

This completion closes the remaining workflow gaps without changing the approved four-item Sales menu, two-item Product Admin menu, or Manager company-report access.

## Behavior

- A Sales payment confirmation changes a normal lock to `PAYMENT_PENDING` only. The customer form is not opened until Sales Admin confirms the payment.
- Sales Admin confirmation changes the product to `SOLD` / `Đã bán`, keeps a draft contract for the owning Sales employee, and hands the full contract form to that employee.
- Booking approval creates only the next sequential waiting booking. It never starts matching immediately or changes a product.
- Only the Sales employee assigned to an approved booking can match a unit during that booking's ten-minute slot. The API enforces the same rule as the UI.
- A draft customer/contract created to preserve the transaction relation is not treated as a submitted customer record. It becomes visible to Sales Admin only after Sales submits the completed contract for review.
- Sales customer and contract queries are scoped to the current employee. Sales Admin and Manager retain their intended review scopes; Product Admin has no customer or company-revenue access.
- Sales Admin can approve or request changes on submitted contracts. Request-change endpoints validate the reviewer role and actor identity.
- Product Admin cannot create or edit bookings, even when viewing the booking sub-view inside a project.
- Every report entry point is labelled `Báo Cáo`. PDF export is removed; the formatted Excel export and date filters remain.

## Data and API boundaries

Existing Prisma relations remain in place. Draft placeholder customers use `DRAFT` verification state and stable transaction identifiers. Customer verification is created or moved to `PENDING` only on Sales contract submission.

Role and ownership checks are duplicated at the API boundary and in the UI. Client state/localStorage is treated as a cache only; it cannot authorize matching, financial edits, or company-report access.

## Verification

Add focused tests for booking ownership, lock-payment sequencing, draft visibility, customer scoping, Product Admin write denial, report labels/PDF removal, and existing financial/status behavior. Run the complete test suite, TypeScript, Prisma validation, production build, and a local API smoke journey.
