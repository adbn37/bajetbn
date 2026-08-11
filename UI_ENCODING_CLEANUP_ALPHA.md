# BajetBN v0.11.20 — UI Encoding Cleanup

## Corrected areas

- Inventory condition, SKU and stock labels
- Recent Marketplace Sales metadata
- Seller and Marketplace information
- Household and shared Space labels
- Onboarding currency and progress labels
- Project-wide source scan for malformed UTF-8 text

## Release protection

The structural suite now scans UI source files for malformed encoding markers, replacement characters and broken Space separators.
