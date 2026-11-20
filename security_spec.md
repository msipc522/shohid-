# Security Specification — BariVara Pro

## 1. Data Invariants
1. **Strict Multi-Device Owner Isolation**: Every document (`UserSettings`, `Unit`, `Tenant`, `Bill`) lives under `/users/{userId}` and enforces `request.auth.uid == userId`, `request.auth.token.email_verified == true`, and `data.ownerUid == request.auth.uid`.
2. **Relational Referential Integrity**: A `Tenant` or `Bill` document cannot be created unless the parent `/users/{userId}/units/{unitId}` document exists.
3. **Immutable Ownership & Timestamps**: `ownerUid`, `id`, and `createdAt` can never be altered after creation; `createdAt` and `updatedAt` must strictly equal `request.time`.
4. **No Shadow Fields / Payload Exhaustion**: All `create` operations use `keys().hasAll(...) && keys().hasOnly(...)` and all `update` operations use `affectedKeys().hasOnly(...)`. Every string and array has explicit `.size()` bounds so tenant documents remain well under Firestore's 1MB limit.
5. **Meter & Monetary Integrity**: `currReading >= prevReading >= 0`, `unitRate >= 0`, `baseRent >= 0`, `paidAmount >= 0`, `dueAmount >= 0`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Read**: `GET /users/uid1/units/room_101` with `auth = null`.
2. **Cross-Tenant PII Read**: `GET /users/uid1/tenants/ten_1` as `uid2` (`email_verified: true`).
3. **Unverified Email Write**: `CREATE /users/uid1/units/room_101` as `uid1` with `email_verified: false`.
4. **Owner Spoofing on Create**: `CREATE /users/uid1/units/room_101` as `uid1` with `ownerUid: "uid2"`.
5. **Shadow Field Injection**: `CREATE /users/uid1` as `uid1` with extra field `isAdmin: true`.
6. **ID Poisoning**: `CREATE /users/uid1/units/bad$id` (invalid characters) or 200-char ID.
7. **Orphaned Tenant**: `CREATE /users/uid1/tenants/ten_99` referencing nonexistent `unitId: "room_999"`.
8. **Orphaned Bill**: `CREATE /users/uid1/bills/bill_99` referencing nonexistent `unitId: "room_999"`.
9. **Client-Forged Timestamp**: `CREATE /users/uid1/bills/bill_1` with `createdAt` in the past instead of `request.time`.
10. **Immutable Field Mutation**: `UPDATE /users/uid1/tenants/ten_1` attempting to modify `createdAt` or `ownerUid`.
11. **Array / Image Payload Bomb**: `CREATE /users/uid1/tenants/ten_1` with `extraDocs` length > 4 or `passportImg` > 160,000 chars.
12. **Negative Meter / Reverse Reading**: `CREATE /users/uid1/bills/bill_1` with `currReading: 100, prevReading: 200`.
