# Let's Encrypt SSL Insuance Service

## Table of Contents

1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [Tech Stack](#tech-stack)
4. [Repository Structure](#repository-structure)
5. [Environment & Configuration](#environment--configuration)

   - [`.env`](#env)
   - [`.gitignore`](#gitignore)
   - [`package.json`](#packagejson)
   - [`tsconfig.json`](#tsconfigjson)
   - [`prisma/schema.prisma`](#prismaschemaprisma)

6. [Database & ORM Layer (Prisma)](#database--orm-layer-prisma)
7. [Entry Point (`src/index.ts`)](#entry-point-srcindexts)
8. [Authentication & Session Management](#authentication--session-management)

   - [`src/middlewares/authentication.ts`](#srcmiddlewaresauthenticationts)
   - [`src/utils/auth/jwt.ts`](#srcutilsauthjwtts)
   - [`src/database/db.ts` & `src/utils/session/session.ts`](#srcdatabasedbts--srcutilssessionsessionts)

9. [ACME & SSL-Related Functionality](#acme--ssl-related-functionality)

   - [Controllers (`src/controllers/…`)](#controllers-srccontrollers)
   - [Routes (`src/routes/…`)](#routes-srcroutes)
   - [Services (`src/services/…` & `src/controllers/…`)](#services-srcservices--srccontrollers)
   - [Validators (`src/utils/validators/…`)](#validators-srcutilsvalidators)
   - [Timeout Utility (`src/utils/timeout/execute-with-timeout.ts`)](#timeout-utility-srcutilstimeoutexecute-with-timeoutts)

10. [Error Handling (`src/utils/errors/…` & `src/middlewares/error-handler.ts`)](#error-handling-srcutilserrors--srcmiddlewareserror-handlerts)
11. [Logging (`src/utils/log/logger.ts` & `src/middlewares/morgan.ts`)](#logging-srcutilslogloggerts--srcmiddlewaresmorgants)
12. [Cron Job: Token Cleanup (`src/utils/cron_jobs/token-cleanup.ts`)](#cron-job-token-cleanup-srcutilscron_jobstoken-cleanupts)
13. [Use-Case / Workflow Example](#use-case--workflow-example)
14. [Running in Development](#running-in-development)
15. [Building & Running in Production](#building--running-in-production)
16. [License](#license)

---

## Project Overview

This repository implements a **backend service** to streamline the process of acquiring and managing SSL certificates from Let’s Encrypt (the ACME protocol). It offers:

- **User authentication & session management** (including password reset, account verification, JWTs, and HTTP-only cookies).
- **ACME account registration** (creating and storing a Let’s Encrypt account key).
- **Domain‐validation flows** (generating “HTTP-01” challenges, verifying DNS records or HTTP endpoints).
- **Certificate Signing Request (CSR) validation** (parsing/validating incoming CSRs).
- **Automatic SSL certificate issuance** (once the ACME challenges are satisfied).
- **SSL revocation** (revoke existing certificates).
- **Email notifications** (e.g., sending verification emails or certificate issuance confirmations).
- **Timeout guard** (to abort long-running ACME operations if they exceed a configurable duration).
- **Centralized error handling** and **structured logging**.
- A **session store** (Prisma + PostgreSQL) for persisting user sessions.
- A **daily cron job** to clean up expired tokens (e.g., password-reset or verification tokens).

The entire codebase is written in **TypeScript**, using **Express.js** as the web framework and **Prisma** as the ORM (backed by PostgreSQL). Dependencies like **node-forge**, **node-cron**, **nodemailer**, and **jsonwebtoken** support ACME flows, SSL-related cryptography, scheduled cleanups, email notifications, and JWT issuance, respectively.

---

## Key Features

1. **User Management & Auth**

   - **Registration, Login, Logout** with JWT tokens and HTTP-only cookies (`src/controllers/auth-controller.ts`).
   - **Password Reset / Email Verification** tokens, stored in the database with expiry (`src/controllers/auth-controller.ts`).
   - **Role-based Authorization**—each user has a `role` field (e.g., “USER”, “ADMIN”) controlling access to certain endpoints.

2. **ACME Account / Let’s Encrypt Integration**

   - **ACME Account Creation**: Generates a new account key (private key) and registers with Let’s Encrypt (staging/production).
   - **Account Storage**: Persist the account’s `accountKey` (PEM) and `accountUrl` (ACME directory URL) on the `User` record in PostgreSQL (`src/controllers/acme-account-controller.ts`).

3. **Domain Challenge & Verification**

   - **Generate Certificate Challenge** for “HTTP-01” or “DNS-01” (this code focuses on “HTTP-01”) by calling Let’s Encrypt’s ACME directory and returning challenge tokens to the client (`src/controllers/get-domain-challenge-controller.ts`).
   - **Verify Domain Ownership** by polling the Let’s Encrypt ACME server until the challenge passes or times out (`src/controllers/verify-domain-challenge-controller.ts`).

4. **CSR Handling & SSL Certificate Issuance**

   - **Validate CSR**: Parses and ensures a valid CSR is supplied by the client (`src/controllers/validate-csr-controller.ts`).
   - **Generate SSL** once domain ownership is proven: Signs a certificate using the Let’s Encrypt CA, returns both PEM and chain to the client (`src/controllers/generate-ssl-certificate.ts`).

5. **Certificate Revocation**

   - **Revoke an existing certificate**: Accepts a certificate PEM and an account key, then issues a revocation request via ACME (`src/controllers/revoke-ssl-controller.ts`).

6. **Session Management**

   - **Prisma Session Store**: Persists sessions in PostgreSQL (`src/database/db.ts` + `src/utils/session/session.ts`).
   - Uses **express-session** with a Prisma-backed store so that sessions survive server restarts.

7. **Token Cleanup Cron Job**

   - **Daily Cleanup** (midnight every day): Deletes any expired `resetToken` or `verificationToken` from `User` records (`src/utils/cron_jobs/token-cleanup.ts`).

8. **Timeout Wrapper**

   - Guards critical ACME flows (e.g., domain validation, CSR parsing, certificate issuance) so a single request cannot hang indefinitely (`src/utils/timeout/execute-with-timeout.ts`).

9. **Email Notifications**

   - **Nodemailer** + templating: Send verification emails, password reset links, or SSL issuance confirmations (`src/utils/email/email-service.ts` + `src/utils/email/email-template.ts`).

10. **Structured Error Handling & Logging**

    - **Custom Error Classes** (`BadRequestError`, `NotFoundError`, `UnauthenticatedError`, etc.) in `src/utils/errors/…`.
    - **Global Error Handler** in `src/middlewares/error-handler.ts`.
    - **Morgan-style Request Logging** with a custom `morganMiddleware` wrapper (`src/middlewares/morgan.ts`).

---

## Tech Stack

- **Runtime & Language**: Node.js 18+ / TypeScript
- **Web Framework**: Express.js
- **Database & ORM**: PostgreSQL + Prisma
- **Authentication**: JSON Web Tokens (jsonwebtoken) + express-session + Prisma as a session store
- **Email**: Nodemailer
- **Scheduling**: node-cron
- **ACME / SSL**: node-forge + low-level HTTP calls to Let’s Encrypt ACME endpoints (wrapped in `src/services/acme-services.ts`)
- **Validation**: Custom validators + `express-validator` where needed
- **Logging**: morgan (via a middleware wrapper) + custom Winston logger (optional)
- **Environment Management**: dotenv
- **Build Tools**: TypeScript (`tsc`), ts-node-dev (for local development), tsc-alias + tsconfig-paths (for path aliases)

---

## Repository Structure

```
ssl_backend/
├── .env
├── .gitignore
├── package-lock.json
├── package.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma
└── src/
    ├── index.ts
    ├── database/
    │   └── db.ts
    ├── controllers/
    │   ├── acme-account-controller.ts
    │   ├── auth-controller.ts
    │   ├── generate-ssl-certificate.ts
    │   ├── get-domain-challenge-controller.ts
    │   ├── revoke-ssl-controller.ts
    │   ├── validate-csr-controller.ts
    │   ├── validate-email-controller.ts
    │   └── verify-domain-challenge-controller.ts
    ├── routes/
    │   ├── acme-router.ts
    │   ├── auth-router.ts
    │   ├── domain-router.ts
    │   ├── ssl-router.ts
    │   ├── validate-router.ts
    │   └── verify-router.ts
    ├── middlewares/
    │   ├── authentication.ts
    │   ├── error-handler.ts
    │   ├── morgan.ts
    │   ├── not-found.ts
    │   └── session.ts
    ├── services/
    │   ├── acme-services.ts
    │   └── email/
    │       ├── email-service.ts
    │       └── email-template.ts
    ├── types/
    │   └── types.ts
    └── utils/
        ├── auth/
        │   └── jwt.ts
        ├── constants/
        │   └── constants.ts
        ├── cron_jobs/
        │   └── token-cleanup.ts
        ├── errors/
        │   ├── bad-request-error.ts
        │   ├── custom-api-error.ts
        │   ├── index.ts
        │   ├── not-found-error.ts
        │   ├── unathenticated-error.ts
        │   └── unauthorized-error.ts
        ├── log/
        │   ├── app.log
        │   └── logger.ts
        ├── session/
        │   └── session.ts
        ├── timeout/
        │   └── execute-with-timeout.ts
        └── validators/
            ├── csr.ts
            └── domain-and-email.ts
```

---

## Environment & Configuration

Below are all configuration files that must be included exactly as they appear in the codebase.

### `.env`

```env
DATABASE_URL="your database URL"

JWT_SECRET="you jwt secret"
JWT_LIFETIME="3d"

NODE_ENV="put the environment (development/production)"

SESSION_SECRET="your session secret"

EMAIL="your google email"
EMAIL_PASSWORD="your app password"
```

- **`DATABASE_URL`**: PostgreSQL connection string (user=postgres, password=`rootDB2001#` \[URL-encoded as `%23`], db=`SSL`, schema=`public`).
- **`JWT_SECRET`**: Secret for signing JSON Web Tokens.
- **`JWT_LIFETIME`**: How long JWTs remain valid (e.g., 3 days).
- **`NODE_ENV`**: Environment mode (`development`, `production`, etc.).
- **`SESSION_SECRET`**: Secret used by `express-session` to sign session cookies.
- **`EMAIL` / `EMAIL_PASSWORD`**: Credentials for the SMTP service that sends verification or notification emails (via Nodemailer).

> **Important**: `.env` is listed in `.gitignore` (below) so these secrets do not get committed.

---

### `.gitignore`

```
/node_modules
.env
src/utils/log/app.log
TODO
```

- Ignores local dependencies (`node_modules`), your `.env` file, the application log file (`app.log`), and a stray `TODO` file.

---

### `package.json`

- **Scripts**

  - `dev`: Runs `tsnd` (TypeScript Node Dev) in watch mode, with path aliases (`tsconfig-paths`) and skipping type-checking (`--transpile-only`).
  - `build`: Compiles TypeScript (`tsc`) then rewrites path aliases for production (`tsc-alias`).
  - `start`: Runs the compiled output in `./dist`.
  - `postinstall`: After any install, runs `prisma generate` to ensure the Prisma Client is up to date.

- **Dependencies**

  - `@prisma/client` & `prisma`: Prisma ORM and Client.
  - `bcryptjs`: Password hashing.
  - `cookie-parser`: Parse and sign cookies.
  - `cors`: Enable Cross-Origin Resource Sharing.
  - `dotenv`: Load environment variables.
  - `express`, `express-async-errors`: Web framework + automatic async error propagation.
  - `express-rate-limit`: To limit repeated requests from the same IP.
  - `express-session`: Session management.
  - `helmet`: Adds security headers.
  - `http-status-codes`: Named HTTP status codes.
  - `jsonwebtoken`: JWT issuance and verification.
  - `morgan`: HTTP request logging.
  - `node-cron`: Cron scheduling.
  - `node-forge`: Cryptographic primitives (CSR parsing, key generation).
  - `nodemailer`: Sending emails.
  - `ts-node-dev`, `tsc-alias`, `tsconfig-paths`, `typescript`: TypeScript toolchain and path alias support.

---

### `tsconfig.json`

- **`module`**: Emits CommonJS modules (Node.js).
- **`target`**: Transpile down to ES2016.
- **`noImplicitAny`**: Disallow untyped variables.
- **`strict`**: Strict type-checking.
- **`esModuleInterop`**, **`skipLibCheck`**, **`forceConsistentCasingInFileNames`**: Common safety flags.
- **`rootDir/outDir`**: Source in `src/`, output in `dist/`.
- **`baseUrl` & `paths`**: Use `@/…` aliases for any `src/...` import (e.g., `import {...} from "@/utils/jwt";`).

---

### `prisma/schema.prisma`

- **`User`**

  - `id`: UUID primary key.
  - `name` / `email` / `password`: Basic account fields.
  - `resetToken` & `verificationToken` (with expiries): For password reset and email verification flows.
  - `emailVerified`: If set, the user has clicked a verification link.
  - `accountKey` & `accountUrl`: Let’s Encrypt ACME account’s private key (PEM) and account URL (returned by ACME directory).
  - Timestamps (`createdAt`, `updatedAt`) auto-maintained by Prisma.

- **`Session`**

  - A session store for `express-session`, where:

    - `sid` is the session ID (unique).
    - `data` is a JSON-stringified session payload.
    - `expiresAt` is when the session should expire.

> **Note**: To perform migrations, run `npx prisma migrate dev --name init` (or `deploy` for production). After migrating, your PostgreSQL instance will hold two tables: `User` and `Session`.

---

## Database & ORM Layer (Prisma)

- **`src/database/db.ts`**

  - Exports a **singleton** Prisma Client instance.
  - Uses `process.env.DATABASE_URL` to connect.
  - In production (`NODE_ENV === "production"`), it creates a single global instance; in development, it attaches to `globalThis` so you don’t accidentally open multiple connections during hot reloading.

- **Session Store**

  - In `src/utils/session/session.ts`, the repository uses `express-session` with a custom store backed by Prisma.
  - Each new session writes a row to `Session` (with `sid`, `data`, `expiresAt`).
  - When the session middleware sees an existing `sid` cookie, it loads session data from Prisma.

---

## Entry Point: (`src/index.ts`)

1. **`dotenv.config()`** – Loads environment variables from `.env`.
2. **Express Initialization**:

   - `app.use(cors({ origin: "*", credentials: true }));` (allows cross-origin requests).
   - `app.use(express.json())`, `app.use(express.urlencoded({ extended: true }))` for body parsing.
   - `app.use(cookieParser(process.env.SESSION_SECRET))` to parse and sign cookies.
   - `app.use(morganMiddleware)` to enable HTTP logging.

3. **Routers Mounted**:

   - `/auth` → `authRouter`
   - `/acme` → `acmeRouter`
   - `/validate` → `validateRouter`
   - `/domain` → `domainRouter`
   - `/verify` → `verifyRouter`
   - `/ssl` → `sslRouter`

4. **404 Handler**: `app.use(notFound)`
5. **Global Error Handler**: `app.use(errorHandler)`

Finally, `app.listen(PORT, …)` starts the server.

---

## Authentication & Session Management

### `src/middlewares/authentication.ts`

- **`authenticateUser`** middleware:

  1. Reads a JWT from `req.cookies.token`. If missing, throws `UnauthenticatedError("Authentication invalid")`.
  2. Verifies the token via `jwt.verifyToken(token)` (`src/utils/auth/jwt.ts`).
  3. Attaches the decoded payload (`userId`, `name`, `email`, etc.) to `req.user`.
  4. Calls `next()`.

- **`authorizePermissions(...roles: string[])`**:

  - Checks if `req.user.role` is one of the allowed roles. If not, throws `UnauthorizedError("Not authorized to access this route")`.

- **Session Middleware (`src/middlewares/session.ts`)**:

  - Initializes `express-session` with:

    - `secret: process.env.SESSION_SECRET`
    - `resave: false`, `saveUninitialized: false`
    - A custom store: a small wrapper around Prisma so that sessions are persisted to the `Session` table (instead of in-memory).

### `src/utils/auth/jwt.ts`

- **`createToken`**: Signs a JWT with a given payload (e.g., `{ userId, email, role }`), using `JWT_SECRET` and `JWT_LIFETIME` from `.env`.
- **`verifyToken`**: Verifies incoming JWTs, returning the decoded payload or throwing an error if invalid/expired.

### `src/database/db.ts`

- Exposes a **singleton** Prisma Client.
- In development, attaches it to `global` to avoid multiple instances during hot reload.
- In production, simply uses a single instance.

### `src/utils/session/session.ts`

- Wraps `express-session` and implements the methods required by `express-session` stores:

  - `get(sid, callback)`, `set(sid, session, callback)`, `destroy(sid, callback)`.

- Under the hood, each method calls into Prisma:

  - `store.set(sid, JSON.stringify(session), expiresAt)` → `prisma.session.create()` or `upsert()`.
  - `store.get(sid)` → `prisma.session.findUnique({ where: { sid } })`.
  - `store.destroy(sid)` → `prisma.session.delete({ where: { sid } })`.

- The result is that each Express session is persisted to the `Session` table instead of in memory.

---

## ACME & SSL-Related Functionality

### Controllers (`src/controllers/…`)

1. **`acme-account-controller.ts`**

   - **`createAcmeAccount(req, res)`**

     1. Checks if the authenticated user already has `accountKey` / `accountUrl` stored. If so, throws `BadRequestError("ACME account already exists")`.
     2. Generates a new RSA key (e.g., via `node-forge.pki.rsa.generateKeyPair()` or the ACME-client library).
     3. Sends a “newAccount” request to Let’s Encrypt’s ACME directory, retrieving an `accountUrl`.
     4. Stores `accountKey` (PEM-encoded) and `accountUrl` on the `User` row in PostgreSQL via Prisma.
     5. Returns a 201 response: `{ status: "success", data: { accountUrl } }`.

2. **`get-domain-challenge-controller.ts`**

   - **`getDomainChallenge(req, res)`**

     1. Expects a JSON body with `{ domain: string }`. Validates format via `domain-and-email.ts` validator.
     2. Fetches the user’s stored `accountKey` (PEM) and `accountUrl` from their `User` row. If missing, throws `BadRequestError("ACME account not found")`.
     3. Calls ACME “newOrder” endpoint to create an authorization object for that domain.
     4. Retrieves the “HTTP-01” challenge token from the order’s authorizations.
     5. Returns 200: `{ status: "success", data: { token: "<challenge-token>", authorizationUrl: "<acme-authz-url>" } }`.

3. **`verify-domain-challenge-controller.ts`**

   - **`verifyDomainChallenge(req, res)`**

     1. Expects `{ token: string, keyAuthorization: string }`.
     2. Uses the user’s `accountKey` to request Let’s Encrypt to “respond” to the HTTP-01 challenge, then polls the challenge status until “valid” or a timeout occurs.
     3. If valid, returns `{ status: "success", message: "Domain verified" }`. Otherwise, throws a `BadRequestError("Unable to verify domain")` or times out via `execute-with-timeout.ts`.

4. **`validate-csr-controller.ts`**

   - **`validateCsr(req, res)`**

     1. Expects a CSR (Certificate Signing Request) in PEM format in the request body (e.g., `{ csr: "-----BEGIN CERTIFICATE REQUEST-----…"} `).
     2. Uses `node-forge` to parse and ensure the CSR is valid, extraction of subject details, public key algorithm, and any “subjectAltName” entries.
     3. If invalid or malformed, throws `BadRequestError("Invalid CSR")`.
     4. Returns metadata: `{ status: "success", data: { commonName, altNames: [ … ], publicKeyAlgo, etc. } }`.

5. **`generate-ssl-certificate.ts`**

   - **`generateSslCertificate(req, res)`**

     1. Expects:

        - `{ token: string, authorizationUrl: string, csr: string }`.

     2. Verifies domain ownership (ensures that the challenge is still “valid” or re-verifies if needed).
     3. Posts a “finalize” request to ACME with the CSR DER, obtaining a certificate URL.
     4. Polls the Let’s Encrypt directory until the certificate is issued.
     5. Fetches the issued certificate chain in PEM.
     6. Returns 201: `{ status: "success", data: { certificatePem: "<full-chain-PEM>", expiresAt: "<ISO-date>" } }`.

6. **`revoke-ssl-controller.ts`**

   - **`revokeSslCertificate(req, res)`**

     1. Expects in the body: `{ certificatePem: string }`.
     2. Uses the user’s stored `accountKey` (PEM) to call ACME “revokeCert” endpoint.
     3. If successful, returns `{ status: "success", message: "Certificate revoked" }`. Otherwise, throws `BadRequestError("Unable to revoke certificate")`.

7. **`validate-email-controller.ts`**

   - **`validateEmail(req, res)`**

     1. Expects `{ email: string }`. Checks proper email format.
     2. Verifies if `email` is already in use. If so, throws `BadRequestError("Email already registered")`. Otherwise, optionally sends an email verification link (via `email-service.ts`).
     3. Returns `{ status: "success", message: "Verification email sent" }`.

8. **`auth-controller.ts`**

   - **`registerUser(req, res)`**

     1. Expects `{ name, email, password }`.
     2. Validates email/password strength/format via `domain-and-email.ts`.
     3. Hashes `password` with `bcryptjs`, then `prisma.user.create({...})` storing `name`, `email`, `passwordHash`, plus a `verificationToken` + `verificationTokenExpiry` (a random string + timestamp).
     4. Sends a verification email using `email-service.ts` containing a link with `verificationToken`.
     5. Returns `{ status: "success", data: { user: { id, name, email } } }`.

   - **`loginUser(req, res)`**

     1. Expects `{ email, password }`.
     2. Fetches the user by email. If not found or if `bcrypt.compare(password, user.password) === false`, throws `UnauthenticatedError("Invalid credentials")`.
     3. If `user.emailVerified` is null, throws `BadRequestError("Email not verified")`.
     4. Issues a JWT via `createToken({ payload: { userId, email, role } })`.
     5. Sets an HTTP-only cookie named `token` with that JWT.
     6. Returns `{ status: "success", data: { user: { id, name, email, role } } }`.

   - **`logoutUser(req, res)`**

     1. Clears the `token` cookie (`res.clearCookie("token")`).
     2. Returns `{ status: "success", message: "Logged out successfully" }`.

   - **`forgotPassword(req, res)`**

     1. Expects `{ email }`. Finds user; if not found, throws `NotFoundError("User not found")`.
     2. Generates a random `resetToken` + `resetTokenExpiry = now() + 1h`. Saves both on the `User` record.
     3. Sends a password-reset email containing a link with that `resetToken` (via `email-service.ts`).
     4. Returns `{ status: "success", message: "Password reset email sent" }`.

   - **`resetPassword(req, res)`**

     1. Expects `{ token: string, newPassword: string }`. Finds the `User` where `resetToken = token AND resetTokenExpiry > now()`.
     2. If no such user, throws `BadRequestError("Invalid or expired token")`.
     3. Hashes `newPassword` and updates `user.password`; sets `resetToken = null, resetTokenExpiry = null`.
     4. Returns `{ status: "success", message: "Password updated successfully" }`.

9. **`verify-domain-challenge-controller.ts`**

   - Detailed above under “Domain Challenge & Verification.”

10. **`validate-csr-controller.ts`**

- Detailed above under “CSR Handling & SSL Certificate Issuance.”

11. **`generate-ssl-certificate.ts`**

- Detailed above under “CSR Handling & SSL Certificate Issuance.”

12. **`revoke-ssl-controller.ts`**

- Detailed above under “Certificate Revocation.”

---

### Routes (`src/routes/…`)

Each router module is a standard Express router that maps HTTP endpoints to the corresponding controller methods. All routers import the `authentication` middleware to guard protected routes.

1. **`acme-router.ts`**

   - `POST /auth/register` → user registration.
   - `POST /auth/login` → user login.
   - `POST /auth/forgot-password` → request password reset.
   - `POST /auth/reset-password` → perform password reset.
   - `GET /auth/logout` → logout user (clears cookie).

2. **`domain-router.ts`**

   - `POST /domain` → generate an HTTP-01 challenge for the specified domain.

3. **`verify-router.ts`**

   - `POST /verify` → verify that the domain challenge has been satisfied.

4. **`validate-router.ts`**

   - `POST /validate/email` → check email format / availability.
   - `POST /validate/csr` → ensure the CSR is syntactically valid.

5. **`ssl-router.ts`**

   - `POST /ssl/generate` → finalize ACME order, pull issued certificate (PEM) once domain is verified.
   - `POST /ssl/revoke` → revoke an issued certificate.

---

### Services (`src/services/…` & `src/controllers/…`)

1. **`src/services/acme-services.ts`**

   - Encapsulates low-level interactions with the Let’s Encrypt ACME API:

     - **`newAccount(keyPem: string)`** → registers a new account, returns `accountUrl`.
     - **`newOrder(accountKeyPem: string, accountUrl: string, [domains])`** → requests a new order for one or multiple domains.
     - **`getChallengeDetails(orderUrl: string)`** → retrieves the HTTP-01 challenge token.
     - **`respondToChallenge(challengeUrl: string, keyAuthorization: string)`** → signals to Let’s Encrypt that you’ve provisioned the challenge file.
     - **`pollChallenge(challengeUrl: string)`** → polls the ACME challenge endpoint until status = `valid` or `invalid`.
     - **`finalizeOrder(orderUrl: string, csrDer: Buffer)`** → sends the CSR DER to Let’s Encrypt and obtains a certificate URL.
     - **`getCertificate(certUrl: string)`** → polls until a certificate is issued, then downloads the PEM chain.
     - **`revokeCertificate(accountKeyPem: string, certPem: string)`** → revokes a certificate on Let’s Encrypt.

2. **`src/services/email/email-service.ts`**

   - Wraps **Nodemailer**:

     - Creates a transporter using Gmail (with `EMAIL` and `EMAIL_PASSWORD` from `.env`).
     - Exposes `sendEmail({ to, subject, html })` → throws `BadRequestError` if missing fields.

3. **`src/services/email/email-template.ts`**

   - Provides HTML templates for:

     - **`accountVerificationTemplate(token: string)`** → links to `/auth/verify?token=…`.
     - **`passwordResetTemplate(token: string)`** → links to `/auth/reset-password?token=…`.
     - **`sslIssuedTemplate(domain: string, certPem: string)`** → notifies user that their SSL cert is ready, attaching PEM.

---

### Validators (`src/utils/validators/…`)

1. **`domain-and-email.ts`**

   - Exports functions to validate:

     - **`isValidEmail(email: string): boolean`** → Simple regex check.
     - **`isValidDomain(domain: string): boolean`** → Regex or `node-forge` to ensure valid DNS name.

   - Used in `validateEmail` and `getDomainChallenge`.

2. **`csr.ts`**

   - Exports `isValidCsr(csrPem: string): boolean` → Uses `node-forge.pki.certificationRequestFromPem()` to try parsing. Returns `true` if parse succeeds and signature is valid; otherwise `false`.

---

### Timeout Utility (`src/utils/timeout/execute-with-timeout.ts`)

````

* Wraps any promise (e.g., an ACME “pollChallenge” loop) so that if it doesn’t resolve within `ms` milliseconds, the promise rejects with `"Request timed out"`.
* Controllers call this to guard long-running ACME operations (e.g., 2-minute domain validation loops).

---

## Logging (`src/utils/log/logger.ts` & `src/middlewares/morgan.ts`)

### `src/utils/log/logger.ts`

```ts
import { createLogger, format, transports } from "winston";

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.printf(({ level, message, timestamp }) => `${timestamp} ${level}: ${message}`)
  ),
  transports: [
    new transports.File({ filename: "src/utils/log/app.log", level: "info" }),
    new transports.Console(),
  ],
});

export default logger;
````

- Uses **Winston** to log messages both to `app.log` and the console.
- Timestamps every entry; can be extended to log errors, warnings, etc.

### `src/middlewares/morgan.ts`

- In **development mode**, logs every request using Morgan’s `:method :url :status …` format, piping output to Winston.
- In production, skip logging unless `NODE_ENV === "development"`.

---

## Cron Job: Token Cleanup (`src/utils/cron_jobs/token-cleanup.ts`)

- **Logic**:

  1. Finds any `User` whose `resetTokenExpiry < now()`, sets `resetToken = null` and `resetTokenExpiry = null`.
  2. Finds any `User` whose `verificationTokenExpiry < now()`, sets `verificationToken = null` and `verificationTokenExpiry = null`.

- By importing this file at startup (`src/index.ts`), the scheduler is automatically registered.

---

## Use-Case / Workflow Example

Below is a realistic end-to-end scenario illustrating how to register a user, perform domain challenge, then request an SSL certificate:

1. **User Registration & Email Verification**

   1. **Client** calls

      ```http
      POST /auth/register
      Content-Type: application/json

      {
        "name": "Alice Baker",
        "email": "alice@example.com",
        "password": "S3cureP@ss!"
      }
      ```

   2. **Auth Controller**

      - Validates that `email` is well-formed and not already registered.
      - Hashes `password` and calls `prisma.user.create({ data: { name, email, passwordHash, verificationToken: <random>, verificationTokenExpiry: Date.now()+1h } })`.
      - Uses `email-service.ts` to send a verification email with a link to `/auth/verify?token=<verificationToken>`.
      - Returns HTTP 201:

        ```json
        {
          "status": "success",
          "data": {
            "user": {
              "id": "...",
              "name": "Alice Baker",
              "email": "alice@example.com"
            }
          }
        }
        ```

   3. **User Clicks Verification Link**

      ```http
      GET /auth/verify?token=123abc
      ```

   4. **Auth Controller** (verification)

      - Looks up `user = prisma.user.findUnique({ where: { verificationToken: "123abc" }})`.
      - If found and `verificationTokenExpiry > now()`, sets `user.emailVerified = now()` and clears the token fields.
      - Returns HTTP 200: `{ "status": "success", "message": "Email verified" }`.

2. **User Login & Session**

   1. **Client** calls

      ```http
      POST /auth/login
      Content-Type: application/json

      {
        "email": "alice@example.com",
        "password": "S3cureP@ss!"
      }
      ```

   2. **Auth Controller**

      - Finds user by email; verifies `bcrypt.compare("S3cureP@ss!", user.passwordHash)`.
      - Checks `user.emailVerified` is not null.
      - Calls `createToken({ payload: { userId: user.id, email: user.email } })` → sets `token` cookie (HTTP-only).
      - Returns HTTP 200:

        ```json
        {
          "status": "success",
          "data": {
            "user": {
              "id": "...",
              "name": "Alice Baker",
              "email": "alice@example.com"
            }
          }
        }
        ```

3. **ACME Account Registration**

   1. **Client** (authenticated; cookie present) calls

      ```http
      POST /acme/account
      ```

   2. **ACME Account Controller**

      - Checks if `user.accountKey` and `user.accountUrl` already exist. (If yes, returns 400.)
      - Generates a fresh RSA key pair (`node-forge`).
      - Sends a Let’s Encrypt “newAccount” request using `acme-services.ts`.
      - Receives an `accountUrl` (Let’s Encrypt ACME server’s account endpoint).
      - Updates `prisma.user.update({ where: { id: userId }, data: { accountKey: <privateKeyPEM>, accountUrl } })`.
      - Returns HTTP 201:

        ```json
        {
          "status": "success",
          "data": {
            "accountUrl": "https://acme-v02.api.letsencrypt.org/acme/acct/12345..."
          }
        }
        ```

4. **Domain Challenge Generation**

   1. **Client** (authenticated) calls

      ```http
      POST /domain
      Content-Type: application/json

      {
        "domain": "example.com"
      }
      ```

   2. **Get Domain Challenge Controller**

      - Validates `domain` format via `domain-and-email.ts`.
      - Fetches the user’s `accountKey` (PEM) and `accountUrl` from Prisma. If missing, returns 400.
      - Calls `acme-services.newOrder(accountKeyPem, accountUrl, ["example.com"])`.
      - Receives an ACME “authorization” object. Extracts the HTTP-01 challenge token (e.g., `"sampleTokenStr"`).
      - Returns HTTP 200:

        ```json
        {
          "status": "success",
          "data": {
            "token": "sampleTokenStr",
            "authorizationUrl": "https://acme-v02.api.letsencrypt.org/acme/authz-v3/67890..."
          }
        }
        ```

   3. **Client** places a file at `http://example.com/.well-known/acme-challenge/sampleTokenStr` containing the correct key authorization.

5. **Domain Challenge Verification**

   1. **Client** (authenticated) calls

      ```http
      POST /verify
      Content-Type: application/json

      {
        "token": "sampleTokenStr",
        "keyAuthorization": "sampleTokenStr.<thumbprint>"
      }
      ```

   2. **Verify Domain Challenge Controller**

      - Calls `acme-services.respondToChallenge(challengeUrl, keyAuthorization)`.
      - Uses `executeWithTimeout()` to guard the polling of `acme-services.pollChallenge(challengeUrl)`.
      - If status transitions to `"valid"` within the timeout (e.g., 120 seconds), returns HTTP 200:

        ```json
        {
          "status": "success",
          "message": "Domain verified"
        }
        ```

      - Otherwise, throws `BadRequestError("Unable to verify domain")` or `"Request timed out"`.

6. **CSR Validation**

   1. **Client** (authenticated) obtains a CSR in PEM form (e.g., from `openssl req -new …`).
   2. **Client** calls

      ```http
      POST /validate/csr
      Content-Type: application/json

      {
        "csr": "-----BEGIN CERTIFICATE REQUEST-----\n…\n-----END CERTIFICATE REQUEST-----"
      }
      ```

   3. **Validate CSR Controller**

      - Uses `node-forge.pki.certificationRequestFromPem(csrPem)` to parse.
      - If parse fails or signature invalid, throws `BadRequestError("Invalid CSR")`.
      - Otherwise, extracts `commonName`, `subjectAltName` extensions, public key algorithm, and returns HTTP 200:

        ```json
        {
          "status": "success",
          "data": {
            "commonName": "example.com",
            "altNames": ["example.com", "www.example.com"],
            "publicKeyAlgo": "rsaEncryption"
          }
        }
        ```

7. **Generate SSL Certificate**

   1. **Client** (authenticated) now calls

      ```http
      POST /ssl/generate
      Content-Type: application/json

      {
        "token": "sampleTokenStr",
        "authorizationUrl": "https://acme-lifecycle-url…",
        "csr": "-----BEGIN CERTIFICATE REQUEST-----\n…\n-----END CERTIFICATE REQUEST-----"
      }
      ```

   2. **Generate SSL Certificate Controller**

      - First re-verifies that the challenge is still valid (or re-runs the challenge poll if needed).
      - Calls `acme-services.finalizeOrder(orderUrl, csrDer)` → returns a `certificateUrl`.
      - Uses `executeWithTimeout()` to guard `acme-services.getCertificate(certificateUrl)`.
      - Once the certificate is issued, `acme-services.getCertificate()` fetches the PEM chain.
      - Returns HTTP 201:

        ```json
        {
          "status": "success",
          "data": {
            "certificatePem": "-----BEGIN CERTIFICATE-----\n…\n-----END CERTIFICATE-----\n-----BEGIN CERTIFICATE-----\n…\n-----END CERTIFICATE-----\n",
            "expiresAt": "2025-12-15T12:34:56.000Z"
          }
        }
        ```

8. **Revoke SSL Certificate**

   1. **Client** (authenticated) calls

      ```http
      POST /ssl/revoke
      Content-Type: application/json

      {
        "certificatePem": "-----BEGIN CERTIFICATE-----\n…\n-----END CERTIFICATE-----"
      }
      ```

   2. **Revoke SSL Controller**

      - Fetches the user’s `accountKey` from the `User` record.
      - Calls `acme-services.revokeCertificate(accountKeyPem, certificatePem)`.
      - If Let’s Encrypt revocation succeeds, returns HTTP 200:

        ```json
        {
          "status": "success",
          "message": "Certificate revoked"
        }
        ```

      - Otherwise, throws `BadRequestError("Unable to revoke certificate")`.

---

## Running in Development

1. **Clone & Install Dependencies**

   ```bash
   git clone <repository-url> ssl_backend
   cd ssl_backend
   npm install
   ```

2. **Prisma Client Generation & Migrations**

   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

   - This will create the `User` and `Session` tables based on `prisma/schema.prisma`.
   - If you already ran migrations before, you can skip `prisma migrate dev`.

3. **Set Up Environment Variables**
   Create a file named `.env` at the project root and paste in the contents shown earlier (exactly). Replace credentials (e.g., `EMAIL_PASSWORD`) as needed.

4. **Start Development Server**

   ```bash
   npm run dev
   ```

   - Runs `tsnd` (TypeScript Node Dev) on `./src/index.ts`.
   - Automatically reloads on file changes, resolving `@/…` path aliases.

5. **Test Endpoints with Postman / cURL**

   - Register a user: `POST /auth/register`
   - Verify email: `GET /auth/verify?token=…`
   - Login: `POST /auth/login` (cookie will be set)
   - Create ACME account: `POST /acme/account` (requires JWT cookie)
   - Generate domain challenge: `POST /domain` (authenticated)
   - Serve challenge, then verify: `POST /verify`
   - Validate CSR: `POST /validate/csr`
   - Generate SSL: `POST /ssl/generate`
   - Revoke SSL: `POST /ssl/revoke`

---

## Building & Running in Production

1. **Build**

   ```bash
   npm run build
   ```

   - Runs `tsc`, then `tsc-alias` to rewrite `@/…` imports.
   - Output goes into `./dist`.

2. **Start**

   ```bash
   npm run start
   ```

   - Executes `node ./dist`, so make sure you have already run `prisma generate` and applied migrations.
   - Ensure environment variables (`.env`) are set for production (e.g., `NODE_ENV="production"`, a real `DATABASE_URL`, a secure `JWT_SECRET`, etc.).

3. **Process Manager (PM2 / Docker)**

   - Feel free to run `node ./dist/index.js` under any process manager (e.g., **PM2**, **forever**).
   - All environment variables must be supplied in production.
   - Because the session store is backed by Prisma, you can horizontally scale across multiple instances (all pointing to the same PostgreSQL).

---

## License

This project is released under the **ISC License** (as specified in `package.json`). You are free to use, modify, and distribute it under the terms of that license.

---
