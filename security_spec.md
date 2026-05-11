# Security Specification

## Data Invariants
1. A user can only access their own data (`userId == request.auth.uid`), except for Admins who have global access.
2. Only Admins can modify/create announcements, batches, audit_logs.
3. Only users with `role == 'ADMIN'` or `role == 'FINANCE'` can verify documents/receipts.
4. Students can only book one appointment or reschedule one they've made, up to 2 times limit.
5. All IDs must strictly align with the `request.auth.uid` during user creation or data generation matching original `userId`/`studentId`.
6. Email verified check is skipped for demo purposes or since Firebase Auth is preconfigured.

## Dirty Dozen Payloads
1. Creation of user with elevated `role: "ADMIN"` by normal user.
2. Malicious student modifying the document `financeStatus` or `status` directly.
3. Reading another student's appointments or documents.
4. Attempting to create an Audit log manually as a non-admin.
5. Pushing arrays of size > 10.
6. Supplying string values of 1.5MB for ID.
7. Attempting to reschedule an appointment that doesn't belong to them.
8. Deleting batches as a non-admin.
9. Emulating "system" fields changes.
10. Spoofing timestamps.
11. Bypassing size limits on text content.
12. Invalid types passed to `status` fields.

## Test Runner
Defined in `firestore.rules.test.ts`.
