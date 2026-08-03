# BajetBN v0.11.10 — Household Funds and Financial Health Alpha 1

## What this adds

### Optional Household and group funds

Household and Custom Spaces can now use an optional collected-money fund based on the proven Trip money flow.

- The Space owner or admin chooses the person holding the money.
- Members can record contributions and the payment method used.
- Shared expenses can be marked as paid using the collected fund.
- The available amount reduces exactly once when that shared expense is created.
- Contributions can be undone only while enough unspent money remains.
- Trip money continues to work and the original callable names remain available for older app versions.

The fund is optional. Members can still pay each other directly, upload payment proof, and use the existing who-owes-whom flow without setting up a fund.

### Financial health

Money reports now include four beginner-friendly indicators:

- Savings rate — the share of recorded income left after spending.
- Budget pressure — how much of the shown budget has been used.
- Regular payment load — an estimated monthly amount for active repeating bills and instalments compared with recorded income.
- Emergency fund — progress for an active savings goal whose name includes Emergency, Rainy Day, Kecemasan, or Darurat.

The report also shows category changes from the previous month and up to four simple next steps. These are guidance from the user's saved records, not a credit score or investment advice.

### SME overview

When an SME Space is selected in Money reports, BajetBN shows:

- Business money in
- Business money out
- A simple money-in-minus-money-out check
- Current balances for accounts used by that SME Space
- Bills and instalments due during the next 30 days

Accounts remain independent from Spaces. The SME cash position therefore explains that an account may also be used elsewhere.

## Safety and compatibility

- Existing Trip fund records continue to work.
- Existing shared expenses that use `paidFromTripMoney` remain readable.
- New shared expenses also store `paidFromGroupFund`.
- No direct browser write is added for fund balances or contributions.
- Firestore rules continue to allow members to read fund records while trusted Cloud Functions perform changes.
- No exchange-rate conversion or financial product recommendation is provided.

## Staging requirements

Before production, test Trip, Household, and Custom fund setup; contributions; fund-paid expenses; duplicate retries; undo protection; direct-payment flows; mobile layouts; English/Malay wording; health indicators; and the SME overview with staging-only data.
