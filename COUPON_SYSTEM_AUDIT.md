# Coupon System Audit

## Status
The coupon and delivery-zone logic is implemented server-side, which is the correct production approach.

## Validation Rules
- Coupons are validated against active status, date range, usage limit, minimum order value, and optional customer targeting.
- Order totals are recomputed on the server instead of trusting the client.
- Delivery charges and zone eligibility are resolved from the database before order placement.

## Production Recommendation
Keep coupon logic server-side and avoid exposing sensitive discount rules in the frontend.
