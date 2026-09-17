# BajetBN v1.15.0 — Personal / Business Money Scope Alpha 1B

This slice makes Personal and Business money separate by default.

## Global scope

- Global Money Activity shows Personal money only.
- Global Money Reports show Personal money only.
- Business accounts are not loaded into Global Money Activity.
- Business transaction/report callables are not loaded into Global Money Activity or Global Money Reports.
- Global Home remains behaviorally unchanged by this slice.

## Business Space scope

- Business Money Activity remains inside the specific Business Space.
- Business Reports remain inside the specific Business Space.
- Business A data must not appear in Business B.
- Existing Business Space permissions remain authoritative.

## Crossing between Business and Personal

Business money does not become Personal money merely because the same user owns both scopes.

A Business-to-Personal payment such as salary, owner draw, reimbursement or distribution must be an explicit cross-scope workflow.

A future cross-scope bridge should create linked records:
- a Business-side money-out record; and
- a Personal-side money-in record.

Personal-to-Business contributions should follow the same explicit linked-record principle in the opposite direction.

Alpha 1B defines and enforces isolation. It does not yet add the linked cross-scope transfer UI/backend.
