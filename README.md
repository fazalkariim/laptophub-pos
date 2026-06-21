LaptopHub Retail Suite — Backend API

A multi-tenant-ready Point of Sale (POS) backend for a laptop retail business, built with NestJS, Prisma, and PostgreSQL. The system runs as a single business today but carries a tenantId on every table and scopes every query centrally — so it can be turned into a multi-tenant SaaS later without a painful database migration.

Tech Stack


Framework: NestJS (Node.js + TypeScript)
Database: PostgreSQL
ORM: Prisma 7 (with @prisma/adapter-pg)
Auth: JWT + Passport, role-based guards
Validation: class-validator / class-transformer
API docs: Swagger / OpenAPI


Architecture Highlights


Tenant foundation — every business table has a tenantId. A Prisma client extension automatically injects the tenant filter into every query, so no query can accidentally read another tenant's data.
Guard chain — JwtAuthGuard (is the user logged in?) + RolesGuard (does their role allow this?) protect every route.
Thin controllers, fat services — controllers only handle HTTP; all business logic lives in services.
Roles — SUPER_ADMIN, BRANCH_MANAGER, SALESMAN.


Project Structure

src/
├── common/          # shared guards, decorators
│   ├── guards/      # JwtAuthGuard, RolesGuard
│   └── decorators/  # @CurrentUser(), @Roles()
├── context/         # tenant context + middleware (the SaaS foundation)
├── prisma/          # PrismaService + tenant-scoped wrapper
└── modules/
    ├── auth/        # login, JWT, password handling
    ├── users/       # user accounts + roles
    └── branches/    # branch management

Getting Started

Prerequisites


Node.js (LTS v20 or v22)
PostgreSQL running locally
npm


Setup


Clone and install


bash   git clone <your-repo-url>
   cd laptophub-api
   npm install


Configure environment
Copy .env.example to .env and fill in your values:


bash   cp .env.example .env

Set your DATABASE_URL (with your PostgreSQL username/password) and a strong JWT_SECRET.


Create the database
In psql:


sql   CREATE DATABASE laptophub;


Run migrations and generate the client


bash   npx prisma migrate dev
   npx prisma generate


Seed test data


bash   npx prisma db seed

This creates one tenant (LaptopHub), three branches, and three users.


Start the dev server


bash   npm run start:dev


API: http://localhost:3000
Swagger docs: http://localhost:3000/docs


Test Login Credentials

All seeded users share the password password123:

RoleEmailSuper Adminadmin@laptophub.comBranch Managermanager@laptophub.comSalesmansalesman@laptophub.com

Build Roadmap


 M0 — Project setup + tenant foundation
 M1 — Auth, users, branches, catalogue (in progress)

 Auth (login, JWT, password hashing)
 Branches
 Users
 Catalogue



 M2 — Inventory & stock intake
 M3 — POS / Sales
 M4 — CRM & warranty
 M5 — Multi-branch & transfers
 M6 — Purchasing & suppliers
 M7 — Finance
 M8 — Reporting
 M9 — Hardening & launch


License

Private project — all rights reserved.