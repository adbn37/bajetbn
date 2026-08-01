# BajetBN v0.11.8 Brunei Banks and Payment Methods Alpha 1

## Included

- Common Brunei institution presets: BIBD, Baiduri, TAIB and Standard Chartered Brunei.
- Cash and generic e-wallet choices.
- A type-a-different-provider option so users are never blocked by the preset list.
- Standard payment methods for bank transfer, cash, debit card, credit card, e-wallet, QR payment, bank/ATM deposit, cheque and another method.
- Payment-method capture for normal money activity, recurring money, bills and instalments, shared-bill payments, shared-expense payments and Trip-money contributions.
- Existing Accounts and historic financial records remain valid when the new optional fields are absent.
- Search and money-activity details show the saved provider or payment method.

## Data compatibility

Accounts continue to keep the human-readable `institution` field. A new optional `institutionCode` records a known preset without changing old custom names.

Financial records use optional `paymentMethod` and `paymentMethodLabel` fields. Older records display `Not recorded`; they are not silently assigned a method.

## Staging checks

1. Create and edit Accounts using every preset plus a custom provider.
2. Confirm existing custom Account institutions remain unchanged.
3. Record each payment method through normal Money activity.
4. Record an `Other method` and confirm the custom label is required and displayed.
5. Pay a bill/instalment, submit a shared bill payment, settle a shared expense and add Trip money using selected methods.
6. Create recurring income/expense templates and confirm generated transactions keep the selected method.
7. Search by provider and payment-method name.
8. Check English/Malay and mobile layouts.
