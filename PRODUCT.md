# Finance Workspace

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Small teams tracking income and expenses, with Admin, Analyst, and Viewer access levels. A separate, clearly labeled demo lets recruiters and other visitors explore the product without accessing a real team's records.

## Product Purpose

Turn the existing finance dashboard prototype into a complete application: trustworthy financial totals, useful transaction management, working team permissions, and a polished responsive interface.

## Positioning

An income-and-expense workspace with role-aware access. This is a record-management and reporting product, not a bank connection, payment processor, investment platform, or automated accounting service.

## Operating Context

- The user confirmed both a public portfolio/demo use case and real team workspaces.
- New workspaces and the demo use INR by default.
- Existing source: Express 5, TypeScript, Prisma 7, SQLite through the libSQL adapter, and a static JavaScript frontend.
- This project is a dedicated development copy of `C:\Users\Ronack\Downloads\finance-backend`.
- Original Desktop, Downloads, and `.gemini` project folders are reference sources and are not development targets.
- The separate Python/FastAPI GitHub repository is not replaced by this application.

## Capabilities and Constraints

The completed application must support:

- Account creation/sign-in/sign-out and server-enforced workspace isolation.
- An isolated, labeled demo with meaningful synthetic financial records.
- Admin: manage records and people. Analyst: inspect records and reports. Viewer: inspect permitted financial summaries.
- Record creation, editing, soft deletion, filtering, sorting, and pagination.
- Financial summaries, trends, category analysis, and export of authorized data.
- Role and account-status changes that take effect on existing sessions.
- Correct monetary arithmetic, consistent date handling, and validated API inputs.
- Keyboard and mobile access, complete empty/loading/error states, and reduced-motion support.
- Repeatable setup, automated tests, and a deployment configuration with persistent storage.

Public hosting provider and production infrastructure credentials are not yet chosen. No deployment, uptime, bank integration, or compliance claims may be invented.

## Brand Commitments

Product title: **Finance Workspace**. The user asked to avoid the existing Tally accounting-software brand. The refined previews were approved on 7 November 2026. The connected application uses the Mercury/Stripe-inspired workbench as its default, with light and dark themes and continuous data-bound chart insights. The Revolut/Brex exploration remains available in the design previews.

## Evidence on Hand

- Existing working-source API routes for authentication, users, financial records, and dashboard aggregates.
- An existing Prisma schema and a small synthetic seed dataset.
- Existing locally hosted IBM Plex fonts.
- No customer testimonials, commercial metrics, real company financial records, or banking partnerships have been supplied.

## Product Principles

1. Financial arithmetic and authorization are part of the product, not presentation details.
2. A user's workspace never exposes another workspace's records.
3. Every visible action must work and explain its outcome.
4. Demonstration data is labeled and isolated from real records.
5. Motion explains changes and relationships while preserving speed and readability.

## Accessibility & Inclusion

The app must support keyboard navigation, visible focus, semantic controls, readable contrast, mobile layouts, and reduced motion. Financial state must not depend on color alone.
