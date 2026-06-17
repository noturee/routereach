# API Endpoints Reference

All endpoints are prefixed with `/api`.
All endpoints except `/auth/login` and `/auth/register` require `Authorization: Bearer <token>`.

## Auth
| Method | Path | Description |
|---|---|---|
| POST | /auth/login | Authenticate user, return JWT |
| POST | /auth/register | Register new account |
| GET | /auth/me | Get current user profile |
| POST | /auth/logout | Log out (record audit event) |
| GET | /health | Health check |

## Users
| Method | Path | Description |
|---|---|---|
| GET | /users | List users (admin only) |
| GET | /users/:id | Get user by ID |
| POST | /users | Create user (admin only) |
| PUT | /users/:id | Update user |
| DELETE | /users/:id | Delete user (admin only) |
| PUT | /users/:id/deactivate | Deactivate user (admin only) |

## Territories (Phase 3)
| Method | Path | Description |
|---|---|---|
| GET | /territories | List territories |
| GET | /territories/:id | Get territory |
| POST | /territories | Create territory |
| PUT | /territories/:id | Update territory |
| DELETE | /territories/:id | Delete territory |
| POST | /territories/assign-user | Assign user to territory |

## Applicants (Phase 4)
| Method | Path | Notes |
|---|---|---|
| GET | /applicants | List (filtered by territory/role) |
| GET | /applicants/:id | Get applicant |
| POST | /applicants | Create applicant |
| PUT | /applicants/:id | Update applicant |
| DELETE | /applicants/:id | Delete applicant |
| PUT | /applicants/:id/status | Update status (requires reason) |
| PUT | /applicants/:id/mark-complete | Mark complete |
| PUT | /applicants/:id/withdraw | Withdraw application |
| GET | /applicants/:id/status-history | Status change history |
| GET | /applicants/:id/documents | Document checklist |
| POST | /applicants/:id/documents | Add document |
| PUT | /applicants/:id/documents/:id | Update document |
| DELETE | /applicants/:id/documents/:id | Remove document |
| GET | /applicants/:id/case-notes | Case notes for applicant |
| POST | /applicants/:id/case-notes | Add case note |

See full endpoint list in the blueprint (Section 14).
