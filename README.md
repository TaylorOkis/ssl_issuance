# SSL Issuance Service

**A simple software SSL certificate issuance tool for Let’s Encrypt certificates, built in TypeScript.**

---

## Table of Contents

1. [Introduction](#introduction)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Architecture & Project Structure](#architecture--project-structure)
5. [Database Schema (Prisma)](#database-schema-prisma)
6. [ACME Integration & Certificate Workflow](#acme-integration--certificate-workflow)
7. [API Endpoints](#api-endpoints)
8. [Background Jobs (Renewals & Cleanup)](#background-jobs-renewals--cleanup)
9. [Installation & Setup](#installation--setup)
   - [Prerequisites](#prerequisites)
   - [Environment Variables](#environment-variables)
   - [Installation](#installation)
   - [Database Setup (Prisma)](#database-setup-prisma)
   - [Running in Development & Production](#running-in-development--production)
10. [Usage Examples](#usage-examples)
11. [Contributing](#contributing)
12. [License](#license)

---

## Introduction

The **SSL Issuance Service** is a Node.js/TypeScript application that automates the creation, issuance, and renewal of SSL certificates via the Let’s Encrypt ACME protocol. It exposes a RESTful API to:

1. Register a new domain for certificate issuance
2. Perform ACME challenges (HTTP-01 or DNS-01)
3. Finalize orders and download certificates
4. Store certificate metadata and private keys in a secure database (PostgreSQL via Prisma)
5. Automatically renew certificates before expiration using a scheduled job (cron)

This project is intended for DevOps engineers, small-to-medium teams, or hobbyist server administrators who want a lean, self-hostable backend service to manage Let’s Encrypt certificates programmatically.

---

## Features

- **Domain Registration & Validation**

  - Persist domains in a local PostgreSQL database.
  - Trigger ACME HTTP-01 or DNS-01 challenges.
  - Provide challenge tokens/values via API for user-managed DNS or HTTP hosting.

- **Certificate Issuance**

  - Leverage the [`acme-client`](https://www.npmjs.com/package/acme-client) (or equivalent ACME v2 library) to:
    - Create/restore ACME account key
    - Generate Certificate Signing Requests (CSRs)
    - Handle challenge requests and polling
    - Finalize the order and fetch the signed certificate chain

- **Secure Storage**

  - Store private keys, CSRs, and generated certificates encrypted (or on disk, depending on configuration).
  - Record certificate metadata (e.g., issue date, expiration, status) in the database.

- **Automatic Renewal**

  - A `node-cron`‐based job runs daily (or on a configurable schedule) to:
    - Find certificates expiring within 30 days
    - Re-run the ACME challenge and issuance flow
    - Update the stored certificate

- **Certificate Retrieval & Revocation**

  - Endpoints to download active certificates (PEM format) and private keys.
  - Optionally, an endpoint to revoke a certificate via ACME if it has been compromised.

- **Security & Best Practices**
  - Helmet for secure HTTP headers
  - Rate limiting (to prevent abuse of the API)
  - Input validation for domain names and request payloads
  - Environment-driven secrets (ACME account key, database URL)
  - CORS configurable for front-end integration

---

## Tech Stack

- **Runtime & Framework**

  - Node.js (ES Modules, TypeScript)
  - Express (REST API)

- **ACME Client**

  - [`acme-client`](https://www.npmjs.com/package/acme-client) (ACME v2 for Let’s Encrypt)

- **Database & ORM**

  - PostgreSQL (persistent storage)
  - Prisma (Type-safe ORM and schema management)

- **Background Jobs**

  - `node-cron` (scheduled certificate renewal and token cleanup)

- **Authentication & Security**

  - JWT + HTTP-only cookies (if this service is extended to have user auth)
  - `helmet`, `express-rate-limit`, and basic input sanitization

- **Utilities**
  - `dotenv` (environment variable management)
  - `morgan` (HTTP request logging)
  - `http-status-codes` (standardized HTTP response codes)

---

## Architecture & Project Structure

```Rough folder structure
ssl\_issuance/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── controllers/
│   │   ├── domain-controller.ts
│   │   ├── certificate-controller.ts
│   │   └── auth-controller.ts         # (optional, if user auth exists)
│   ├── database/
│   │   └── db.ts                     # Prisma client instance
│   ├── middlewares/
│   │   ├── authentication.ts         # (if user auth is required)
│   │   ├── error-handler.ts
│   │   └── not-found.ts
│   ├── routes/
│   │   ├── domain-router.ts
│   │   ├── certificate-router.ts
│   │   ├── auth-router.ts            # (optional)
│   │   └── index.ts                  # Mounts all routers
│   ├── services/
│   │   └── acme-service.ts           # Wraps `acme-client` logic
│   ├── utils/
│   │   ├── logger.ts                 # Logger abstraction over console or winston
│   │   └── validation.ts             # Input validation (e.g., domain name regex)
│   ├── utils-cron/
│   │   ├── renewal-job.ts            # Cron job to renew certificates
│   │   └── token-cleanup-job.ts      # Purges expired ACME tokens or challenge data
│   └── index.ts                      # Entry point: Express app configuration
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md

```

**Highlights**:

- **`prisma/schema.prisma`**

  - Defines two core models: `Domain` and `Certificate`.
  - `Domain` stores registered domains and their ACME challenge details.
  - `Certificate` stores certificate metadata, expiration dates, and file paths or encrypted blobs for the key and cert.

- **`src/services/acme-service.ts`**

  - Encapsulates all direct interactions with the ACME protocol.
  - Responsible for:
    1. Creating or loading an existing ACME account key.
    2. Creating orders for domain certificates.
    3. Providing challenge tokens for HTTP-01 or DNS-01.
    4. Polling challenge status until validated.
    5. Finalizing the order and retrieving the certificate chain.
    6. Revoking certificates, if necessary.

- **`src/controllers/domain-controller.ts`**

  - `POST /domains/register` → Register a new domain in the database, start ACME order.
  - `GET /domains/:id/challenge` → Return the challenge token & validation string that the user must serve.
  - `PATCH /domains/:id/verify` → Poll ACME to see if challenge is valid and issue the certificate.

- **`src/controllers/certificate-controller.ts`**

  - `GET /certificates/` → List all certificates in the system (with issue dates, expiration).
  - `GET /certificates/:id/download` → Download a PEM bundle (certificate + private key).
  - `POST /certificates/:id/revoke` → Revoke an existing certificate via ACME.

- **`src/utils-cron/renewal-job.ts`**
  - Runs once every 24 hours (`"0 0 * * *"`).
  - Finds all certificates expiring within the next 30 days.
  - For each, re-triggers the ACME challenge/issuance flow to get a renewed certificate.
  - Updates the `Certificate` record in the database with the new expiration date and file paths.

---

## Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Domain {
  id              String    @id @default(uuid())
  hostname        String    @unique
  status          DomainStatus  @default(PENDING)   // PENDING, VALIDATION_IN_PROGRESS, VALIDATED, ERROR
  challengeType   ChallengeType  @default(HTTP_01)  // HTTP_01 or DNS_01
  challengeToken  String?                 // e.g., token returned by ACME for HTTP challenge
  challengeValue  String?                 // e.g., keyAuthorization for HTTP challenge or TXT record for DNS
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  certificates    Certificate[]
  @@index([hostname, status])
}

model Certificate {
  id               String   @id @default(uuid())
  domainId         String
  issuedAt         DateTime @default(now())
  expiresAt        DateTime
  pemCertificate   String   // base64‐encoded PEM or file path
  pemPrivateKey    String   // base64‐encoded PEM or file path
  status           CertStatus   @default(ACTIVE)    // ACTIVE, EXPIRED, REVOKED
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  domain           Domain   @relation(fields: [domainId], references: [id])
  @@index([domainId, status, expiresAt])
}

enum DomainStatus {
  PENDING
  VALIDATION_IN_PROGRESS
  VALIDATED
  ERROR
}

enum ChallengeType {
  HTTP_01
  DNS_01
}

enum CertStatus {
  ACTIVE
  EXPIRED
  REVOKED
}
```

**Notes**:

- A single `Domain` record can have multiple `Certificate` records over time (each time a certificate is issued or renewed).
- The `challengeToken` and `challengeValue` fields store the data needed for HTTP-01 (where the token is served under `/.well-known/acme-challenge/{token}`) or DNS-01 (where the `challengeValue` is set as a TXT record for `_acme-challenge.{hostname}`).

---

## ACME Integration & Certificate Workflow

1. **ACME Account Setup**

   - On the first service startup, `acme-service.ts` checks whether an ACME account key already exists (persisted on disk or in environment‐driven storage).
   - If not, it creates a new account with Let’s Encrypt’s directory endpoint (e.g., `https://acme-v02.api.letsencrypt.org/directory`) and stores the private key securely for future use.

2. **Domain Registration**

   - **Endpoint:** `POST /domains/register`
   - **Payload:** `{ "hostname": "example.com", "challengeType": "HTTP_01" }`
   - The controller:

     1. Validates that `hostname` is a well-formed domain name (via a regex or built-in utility).
     2. Creates a new `Domain` record in the database, with `status = PENDING`.
     3. Calls `acmeService.createOrder(hostname)` to generate a new ACME order and retrieve challenge details.
     4. Populates the `challengeToken` and `challengeValue` fields in the `Domain` record.
     5. Sets `status = VALIDATION_IN_PROGRESS`.

3. **Challenge Verification**

   - Once the user has (for HTTP-01) served `challengeValue` at `http://{hostname}/.well-known/acme-challenge/{challengeToken}` (or, for DNS-01, created a TXT record `_acme-challenge.{hostname}` with the correct `challengeValue`), they call:
     **Endpoint:** `PATCH /domains/:id/verify`

     - The controller checks the current `Domain` record, confirms it’s in `VALIDATION_IN_PROGRESS`.
     - Calls `acmeService.verifyChallenge(orderUrlOrAuthzUrl)` which:

       1. Polls the ACME server to see if the challenge is marked “valid.”
       2. If valid, calls `acmeService.finalizeOrder(orderUrl, csr)`, where `csr` is a CSR generated on the server for `hostname`.
       3. The ACME server returns a PEM‐encoded certificate chain.

     - The controller then creates a new `Certificate` record:

       - `domainId = {id}`,
       - `issuedAt` = now,
       - `expiresAt` = parsed from the returned certificate (e.g., via a library like `x509.js` or built-in `Date` parsing).
       - `pemCertificate` = the full certificate chain (base64 or literal PEM block).
       - `pemPrivateKey` = the private key corresponding to the CSR that was generated.
       - `status = ACTIVE`.

     - Updates `Domain.status = VALIDATED` and clears `challengeToken`/`challengeValue`.

4. **Automatic Renewal**

   - **Job File:** `src/utils-cron/renewal-job.ts`

     - Uses `node-cron` to schedule a task daily at `00:00`:

       ```ts
       import cron from "node-cron";
       import db from "../database/db";
       import acmeService from "../services/acme-service";

       // Run every day at midnight
       cron.schedule("0 0 * * *", async () => {
         // Query certificates that expire within 30 days
         const soonToExpire = await db.certificate.findMany({
           where: {
             expiresAt: { lt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
             status: "ACTIVE",
           },
           include: { domain: true },
         });

         for (const cert of soonToExpire) {
           try {
             // Re-run challenge flow for cert.domain.hostname
             const order = await acmeService.createOrder(cert.domain.hostname);
             // Depending on HTTP or DNS type:
             //   store order.authorization.url and order.challenge details back in Domain
             //   wait for challenge → finalizeOrder → get new certificate
             const newCertPem =
               await acmeService.finalizeOrderAndGetCertificate(order);
             // Parse expiration from newCertPem:
             const { notAfter } = acmeService.parseCertificateDates(newCertPem);
             // Persist updated certificate record:
             await db.certificate.update({
               where: { id: cert.id },
               data: {
                 pemCertificate: newCertPem,
                 issuedAt: new Date(),
                 expiresAt: new Date(notAfter),
               },
             });
           } catch (err) {
             console.error(
               `Failed to renew certificate for domain ${cert.domain.hostname}:`,
               err
             );
             // Optionally update cert.status = 'ERROR' or notify via email/logging
           }
         }
       });
       ```

   - This job ensures that certificates are renewed before expiration, maintaining uninterrupted HTTPS coverage.

5. **Token/Cleanup Job**

   - **Job File:** `src/utils-cron/token-cleanup-job.ts`

     - Purges any leftover ACME challenge tokens or stale authorization objects from the database, e.g.:

       ```ts
       import cron from "node-cron";
       import db from "../database/db";

       // Run every hour
       cron.schedule("0 * * * *", async () => {
         try {
           // Remove any Domain entries stuck in VALIDATION_IN_PROGRESS older than 1 hour
           await db.domain.updateMany({
             where: {
               status: "VALIDATION_IN_PROGRESS",
               updatedAt: { lt: new Date(Date.now() - 60 * 60 * 1000) },
             },
             data: {
               status: "ERROR",
             },
           });
         } catch (err) {
           console.error("Token cleanup job failed:", err);
         }
       });
       ```

---

## API Endpoints

Below is a summary of the primary RESTful routes exposed by this service. All endpoints (except auth) require a valid API key or JWT in the `Authorization` header (`Bearer <token>`), if authentication is enabled. Otherwise, they are open for any client to call.

### 1. Domain Routes (`/domains`)

| Method | Path                     | Description                                                                                                            | Body / Query                                                | Access         |
| :----: | ------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------- |
|  POST  | `/domains/register`      | Register a new domain for certificate issuance. Initiates an ACME order, stores the challenge token/value.             | `{ "hostname": "example.com", "challengeType": "HTTP_01" }` | Public or Auth |
|  GET   | `/domains/:id/challenge` | Retrieve the current challenge token & validation string for the domain.                                               | `:id`                                                       | Public or Auth |
| PATCH  | `/domains/:id/verify`    | Poll the ACME server to check if the challenge is valid. If validation succeeded, finalize the order and issue a cert. | `{}`                                                        | Public or Auth |
|  GET   | `/domains/:id`           | Get details of a domain registration (status, creation date, last updated).                                            | `:id`                                                       | Authenticated  |
|  GET   | `/domains/`              | List all registered domains, with their statuses (PENDING, VALIDATED, etc.).                                           | —                                                           | Authenticated  |
| DELETE | `/domains/:id`           | Unregister a domain (only if no active certificate or if explicitly forced).                                           | `:id`                                                       | Authenticated  |

### 2. Certificate Routes (`/certificates`)

| Method | Path                         | Description                                                                      | Body / Query | Access        |
| :----: | ---------------------------- | -------------------------------------------------------------------------------- | ------------ | ------------- |
|  GET   | `/certificates/`             | List all certificates, sorted by expiration date.                                | —            | Authenticated |
|  GET   | `/certificates/:id`          | Get metadata for a single certificate (issue date, expire date, status, domain). | `:id`        | Authenticated |
|  GET   | `/certificates/:id/download` | Download the certificate chain & private key as a ZIP or separate PEM files.     | `:id`        | Authenticated |
|  POST  | `/certificates/:id/revoke`   | Revoke an active certificate via ACME.                                           | `:id`        | Authenticated |
| DELETE | `/certificates/:id`          | Delete a certificate record (only if status is EXPIRED or REVOKED).              | `:id`        | Authenticated |

### 3. (Optional) Auth Routes (`/auth`)

> If you choose to enable user‐level authentication, these endpoints manage JWT issuance and password resets.

| Method | Path                     | Description                                             | Body / Query                                                      | Access |
| :----: | ------------------------ | ------------------------------------------------------- | ----------------------------------------------------------------- | ------ |
|  POST  | `/auth/login`            | Authenticate an existing user; returns JWT.             | `{ "username": "admin", "password": "..." }`                      | Public |
|  GET   | `/auth/logout`           | Log out (invalidate token or clear cookie).             | —                                                                 | Auth   |
|  POST  | `/auth/forgotPassword`   | Request a password reset email.                         | `{ "email": "admin@example.com" }`                                | Public |
|  GET   | `/auth/verifyResetToken` | Verify a password reset token (query `?token=<token>`). | —                                                                 | Public |
|  POST  | `/auth/changePassword`   | Change password with valid reset token.                 | `{ "token": "...", "password": "...", "confirmPassword": "..." }` | Public |

---

## Background Jobs (Renewals & Cleanup)

### 1. Certificate Renewal Job (`src/utils-cron/renewal-job.ts`)

- **Schedule:** Every day at midnight (`0 0 * * *`)
- **Function:**

  1. Query `Certificate` records where `expiresAt < now + 30 days` and `status = ACTIVE`.
  2. For each soon-to-expire certificate, retrieve its associated `Domain` record.
  3. Re-run the ACME issuance flow:

     - `acmeService.createOrder(domain.hostname)`
     - Provide updated `challengeToken`/`challengeValue` in the `Domain` table.
     - Wait for the user to place the challenge in HTTP or DNS.
     - Poll and finalize order → new PEM certificate.
     - Update `Certificate.pemCertificate`, `Certificate.expiresAt`, set `Certificate.issuedAt = now`.

  4. If renewal fails, log the error & optionally update `Certificate.status = 'ERROR'`.

### 2. Challenge & Token Cleanup Job (`src/utils-cron/token-cleanup-job.ts`)

- **Schedule:** Every hour (`0 * * * *`)
- **Function:**

  - Find any `Domain` rows with `status = VALIDATION_IN_PROGRESS` where `updatedAt < now – 1 hour`.
  - Mark those rows `status = ERROR` to indicate that validation took too long (the user likely never served the challenge).
  - Optionally, emit a warning to a log or monitoring system so admins can intervene.

---

## Installation & Setup

### Prerequisites

- **Node.js** v18+ (ES Modules + TypeScript)
- **npm** v8+ (or `yarn` if preferred)
- **PostgreSQL** v12+ (or a hosted Postgres database)
- **ACME Directory Endpoint** (Let’s Encrypt v2: `https://acme-v02.api.letsencrypt.org/directory`)
- **Optional SMTP server** (for user password resets, if implementing auth)

### Environment Variables

Create a `.env` file in the project root with at least the following variables:

```env
# Database connection string (PostgreSQL)
DATABASE_URL="postgresql://username:password@localhost:5432/ssl_issuance?schema=public"

# ACME (Let’s Encrypt) Account Key storage path (or private key PEM)
ACME_ACCOUNT_KEY_PATH="./acme-account-key.pem"

# Let’s Encrypt ACME directory URL
ACME_DIRECTORY_URL="https://acme-v02.api.letsencrypt.org/directory"

# (Optional) JWT secret for user authentication
JWT_SECRET="supersecretjwtkey"

# (Optional) SMTP settings for password resets
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT=587
SMTP_USER="smtp_user"
SMTP_PASS="smtp_pass"

# Server port (default 4000)
PORT=4000
```

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/TaylorOkis/ssl_issuance.git
   cd ssl_issuance
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

   - This will install all required packages, including `acme-client`, `express`, `prisma`, `node-cron`, etc.

3. **Generate Prisma Client**

   ```bash
   npx prisma generate
   ```

   - This step creates a type-safe Prisma client under `node_modules/@prisma/client` based on `schema.prisma`.

### Database Setup (Prisma)

1. **Initialize the database** (create the schema)

   ```bash
   npx prisma migrate dev --name init
   ```

   - This command runs the initial migration, creating tables for `Domain` and `Certificate` as defined in `prisma/schema.prisma`.

2. **Verify the schema**

   - You can inspect the database directly via `psql` or a GUI tool (DBeaver, pgAdmin) to confirm that the `Domain` and `Certificate` tables exist.

### Running in Development & Production

- **Development (hot-reload)**

  ```bash
  npm run dev
  ```

  - Uses `ts-node-dev` or similar to compile and run the TypeScript code with automatic restarts on file changes.

- **Production (compiled JavaScript)**

  ```bash
  npm run build
  npm start
  ```

  - `npm run build` compiles `src/**/*.ts` into `dist/**/*.js` using `tsconfig.json` settings.
  - `npm start` runs `node dist/index.js`.

Once running, the server listens on the port specified by `PORT` (default: `4000`).

---

## Usage Examples

Below are typical sequences of API calls to register a domain, validate it, and download the issued certificate. You can use `curl`, Postman, or any HTTP client.

### 1. Register a New Domain

**Request**

```
POST http://localhost:4000/domains/register
Content-Type: application/json

{
  "hostname": "example.com",
  "challengeType": "HTTP_01"
}
```

**Response (201 Created)**

```json
{
  "domain": {
    "id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
    "hostname": "example.com",
    "status": "VALIDATION_IN_PROGRESS",
    "challengeType": "HTTP_01",
    "challengeToken": "X3yZaBcDeFgHiJkLmNoPqRsTuVwXyZ",
    "challengeValue": "X3yZaBcDeFgHiJkLmNoPqRsTuVwXyZ.Mm6tK3... (keyAuthorization)",
    "createdAt": "2025-06-05T14:22:10.123Z",
    "updatedAt": "2025-06-05T14:22:10.123Z"
  }
}
```

> **Next Step (HTTP-01):**
>
> 1. On your webserver for `example.com`, serve a static file at:
>
>    ```
>    http://example.com/.well-known/acme-challenge/X3yZaBcDeFgHiJkLmNoPqRsTuVwXyZ
>    ```
>
>    whose contents are the `challengeValue` from the response.
>
> 2. Then call the “verify” endpoint below to inform our service that you’ve provisioned the file.

### 2. Verify the Challenge

**Request**

```
PATCH http://localhost:4000/domains/a1b2c3d4-5678-90ab-cdef-1234567890ab/verify
Content-Type: application/json
```

**Response (200 OK)**

```json
{
  "certificate": {
    "id": "f1e2d3c4-b5a6-7890-cdef-112233445566",
    "domainId": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
    "issuedAt": "2025-06-05T14:24:30.456Z",
    "expiresAt": "2025-09-03T14:24:30.456Z",
    "status": "ACTIVE",
    "pemCertificate": "-----BEGIN CERTIFICATE-----\nMIIF...IDAQAB\n-----END CERTIFICATE-----\n",
    "pemPrivateKey": "-----BEGIN PRIVATE KEY-----\nMIIE...AB\n-----END PRIVATE KEY-----\n",
    "createdAt": "2025-06-05T14:24:30.456Z",
    "updatedAt": "2025-06-05T14:24:30.456Z"
  }
}
```

> On success, the `Domain.status` is updated to `VALIDATED`, and a new `Certificate` record is created.

### 3. Download the Issued Certificate

**Request**

```
GET http://localhost:4000/certificates/f1e2d3c4-b5a6-7890-cdef-112233445566/download
Accept: application/json
Authorization: Bearer <your-jwt-or-api-key>
```

**Response (200 OK)**

```json
{
  "pemCertificate": "-----BEGIN CERTIFICATE-----\nMIIF...IDAQAB\n-----END CERTIFICATE-----\n",
  "pemPrivateKey": "-----BEGIN PRIVATE KEY-----\nMIIE...AB\n-----END PRIVATE KEY-----\n"
}
```

> You can save these PEM blocks to disk as `cert.pem` and `privkey.pem` to install on your web server.

### 4. Revoke an Existing Certificate

**Request**

```
POST http://localhost:4000/certificates/f1e2d3c4-b5a6-7890-cdef-112233445566/revoke
Content-Type: application/json
Authorization: Bearer <your-jwt-or-api-key>
```

**Response (200 OK)**

```json
{
  "message": "Certificate revoked successfully.",
  "certificateId": "f1e2d3c4-b5a6-7890-cdef-112233445566"
}
```

> After revocation, the `Certificate.status` is set to `REVOKED`. The ACME server has been instructed to revoke the certificate chain, invalidating it.

---

## Contributing

Contributions are welcome! Please follow this process:

1. **Fork the repository** and create a new branch:

   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Make your changes** in a clean, well-structured manner.
3. **Write tests** if you introduce new logic (e.g., ACME service functions).
4. **Run the test suite** (if tests exist) and ensure everything passes.
5. **Commit** your changes with a clear message:

   ```bash
   git commit -m "feat: add DNS-01 challenge support"
   ```

6. **Push to your fork**:

   ```bash
   git push origin feature/my-new-feature
   ```

7. **Open a Pull Request** on the `main` branch of this repository. Describe in detail what you changed and why.

**Coding Style Guidelines**:

- Use `Prettier`/`ESLint` if configured (follow existing `.eslintrc`/`.prettierrc`).
- Keep TypeScript code strictly typed (avoid `any`).
- Document all public functions and express routes with JSDoc‐style comments.
- Add or update relevant tests when modifying or adding new functionality.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for full details.

---

```
::contentReference[oaicite:0]{index=0}
```
