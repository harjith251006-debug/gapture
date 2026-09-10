# Gapture — FT-07
## Detailed Technology Stack & Architecture Document

**Product:** Gapture — Regulatory Compliance Intelligence Platform  
**Tagline:** Gaps, Captured.  
**PRD Basis:** FT-07 Master Product Requirements Document v1.1  
**Architecture Target:** MVP / Hackathon Implementation  
**Primary Regulatory Sources:** RBI and SEBI  
**Document Status:** Technology Architecture Decision

---

# 1. Purpose

This document translates the FT-07 Master Product Requirements Document into a practical technology stack and implementation architecture.

The architecture preserves the functional workflow defined in the PRD:

```text
RBI / SEBI
    ↓
Source Monitoring Platform
    ↓
Watchdog Extraction
    ↓
File Found?
    ↓
OCR
    ↓
SHA-256 / Encryption
    ↓
Store Original
    ↓
Document Cleaning
    ↓
NLP
    ↓
Company Compliance Policy Comparison
    ↓
1-Line / Detailed / Summary
    ↓
Supabase Backend
    ↓
Web Application
    ↓
Notification
    ↓
View
    ↓
Voice
    ↓
ElevenLabs
    ↓
Contextual LLM
```

The PRD explicitly limits regulatory monitoring to **RBI and SEBI**. FIU is excluded from the system. 

---

# 2. Architecture Principles

## 2.1 MVP-first architecture

The system should use the smallest practical number of technologies while still implementing the complete core workflow.

The architecture should avoid unnecessary infrastructure such as:

- Kubernetes
- Kafka
- Redis
- multiple backend services
- multiple databases
- separate authentication providers
- separate notification providers
- complex enterprise key-management infrastructure for the initial MVP

## 2.2 One primary application backend

Supabase will act as the primary application backend and PostgreSQL database.

There will be:

```text
ONE SUPABASE BACKEND
```

This is consistent with the PRD's explicit requirement for a single Supabase Backend.

## 2.3 Background monitoring is separate from the user interface

The regulatory monitoring process must operate independently in the background.

The user should not need to manually start each monitoring cycle.

Therefore:

```text
WEB APPLICATION
        ≠
CONTINUOUS MONITORING WORKER
```

The monitoring worker is a backend process.

## 2.4 Managed services wherever possible

The MVP should prefer managed/free-tier services rather than manually maintaining infrastructure.

---

# 3. Final MVP Technology Stack

| Layer | Selected Technology | Purpose |
|---|---|---|
| Frontend | Next.js | Web application |
| Frontend Language | TypeScript | Application development |
| Backend Runtime | Node.js | Backend processing and workers |
| Database | PostgreSQL | Primary relational database |
| Backend Platform | Supabase | Database, authentication, storage and application backend |
| Vector Database | Pinecone | Semantic/vector retrieval |
| Regulatory Monitoring | RSS + lightweight web fetching | Detect new RBI/SEBI documents |
| Watchdog | Node.js/TypeScript | Detect newly available files |
| OCR | OCR.space | Extract text from regulatory documents |
| Hashing | SHA-256 | Document fingerprinting/integrity |
| Encryption | AES-256 recommended for stored files | Protect original documents |
| Object Storage | Supabase Storage | Store original regulatory files |
| Document Processing | Node.js/TypeScript | Cleaning and preprocessing |
| LLM | OpenAI API | NLP analysis, summarization and contextual Q&A |
| Embeddings | OpenAI Embeddings | Convert content into vectors |
| Vector Store | Pinecone | Store and retrieve embeddings |
| Text-to-Speech / Voice | ElevenLabs API | Voice interaction |
| Authentication | Supabase Auth | User authentication |
| Notifications | In-app notifications | MVP notification mechanism |
| Hosting | Vercel | Next.js web deployment |
| Monitoring Worker Hosting | Separate Node.js worker host | Continuous monitoring |
| Mobile | WebView-based shell | Mobile access to web application |
| Version Control | Git + GitHub | Source-code management |

---

# 4. High-Level System Architecture

```text
                       ┌─────────────────────┐
                       │      RBI / SEBI     │
                       └──────────┬──────────┘
                                  ↓
                       ┌─────────────────────┐
                       │ SOURCE MONITORING   │
                       │ PLATFORM            │
                       │                     │
                       │ RSS / Web Fetching  │
                       └──────────┬──────────┘
                                  ↓
                       ┌─────────────────────┐
                       │ WATCHDOG EXTRACTION │
                       └──────────┬──────────┘
                                  ↓
                         ┌─────────────────┐
                         │ FILE FOUND?     │
                         └───────┬─────────┘
                            NO   │   YES
                                 │
                ┌────────────────┘
                ↓
       CONTINUOUS MONITORING
                ↓
       SOURCE MONITORING


YES
 ↓
┌────────────────────────┐
│ OCR.space              │
│ (Free OCR API)         │
└───────────┬────────────┘
            ↓
     OCR TEXT / DATA
            ↓
     DOCUMENT CLEANING
            ↓
     CHUNKING / PARSING
            ↓
   ┌────────┴─────────┐
   ↓                  ↓
Regulatory        Company Policy
Document          Context
   ↓                  ↓
Embeddings        Embeddings
   └────────┬─────────┘
            ↓
        PINECONE
            ↓
    Relevant Context
            ↓
       OPENAI API
            ↓
 ┌──────────┼───────────┐
 ↓          ↓           ↓
1-LINE    DETAILED    SUMMARY
 ↓          ↓           ↓
TITLE      VIEW      DESCRIPTION
 └──────────┼───────────┘
            ↓
     SUPABASE BACKEND
            ↓
      NEXT.JS WEB APP
            ↓
       NOTIFICATION
            ↓
          USER
            ↓
          VIEW
            ↓
      VOICE BUTTON
            ↓
       ELEVENLABS
            ↓
       CONTEXTUAL
       OPENAI LLM
```

---

# 5. Frontend

## Technology

**Next.js + TypeScript**

## Purpose

Next.js provides the primary Gapture web application.

The frontend is responsible for:

- user interface
- authentication screens
- regulatory information dashboard
- notification interface
- regulatory document view
- 1-line result display
- summary display
- detailed information display
- voice interaction interface
- contextual question interface
- responsive mobile web experience

## Recommended frontend structure

```text
src/
├── app/
│   ├── login/
│   ├── dashboard/
│   ├── regulations/
│   ├── notifications/
│   └── api/
│
├── components/
│   ├── NotificationCard
│   ├── RegulatoryCard
│   ├── Summary
│   ├── DetailedAnalysis
│   ├── VoiceButton
│   └── QuestionInterface
│
├── lib/
│   ├── supabase
│   ├── openai
│   ├── pinecone
│   └── elevenlabs
│
└── types/
```

---

# 6. Backend

## Technology

**Node.js + TypeScript**

Node.js is used for backend processing and background jobs.

The backend responsibilities include:

- regulatory source monitoring
- RSS processing
- web requests
- file detection
- document downloading
- SHA-256 hashing
- document processing
- calling OCR services
- document cleaning
- calling OpenAI
- generating embeddings
- Pinecone operations
- notification creation
- contextual AI processing

---

# 7. Regulatory Source Monitoring

## Sources

Only:

```text
RBI
SEBI
```

FIU is not implemented.

The PRD requires the Source Monitoring Platform to continuously monitor RBI and SEBI and allows RSS where available.

## Technology

### Primary

**RSS**

### Secondary

**Node.js HTTP fetching**

For pages where an appropriate RSS feed is not available, the worker can fetch the relevant regulatory page and identify document links.

The MVP should not begin with a sophisticated crawler.

### Simplified flow

```text
RBI RSS / Page
       ↓
SEBI RSS / Page
       ↓
Node.js Monitoring Worker
       ↓
Extract document/link
       ↓
Check previously processed hash/URL
       ↓
New file?
```

---

# 8. Background Monitoring Worker

## Technology

**Node.js + TypeScript**

The worker runs independently of the Next.js user interface.

### Responsibility

```text
START
  ↓
Check RBI
  ↓
Check SEBI
  ↓
Extract new files
  ↓
File found?
  ├── NO → Wait → Check again
  └── YES → Process document
```

## Important

Vercel should primarily host the Next.js application.

The continuous monitoring process should run as a separate worker because the PRD explicitly defines monitoring as a continuous backend service.

For the hackathon, this worker can be deployed on a simple Node.js hosting platform rather than introducing complex cloud infrastructure.

---

# 9. Watchdog Extraction

## Technology

**Node.js + TypeScript**

Watchdog Extraction is an application-level processing module rather than a separate external product.

### Purpose

Determine whether a new regulatory file has been detected.

```text
Scraped Source
      ↓
Watchdog
      ↓
New file?
 ┌────┴────┐
NO        YES
↓          ↓
Loop       OCR
```

### Detection signals

The MVP can use:

- source URL
- document URL
- publication date
- filename
- SHA-256 hash

---

# 10. OCR

## Selected Technology

**OCR.space** — free-tier external OCR API. **(Amendment 2026-09-10: this section previously named NVIDIA Nemotron OCR v2 as the selected OCR technology. That decision has been superseded — see `docs/IMPLEMENTATION-PLAN.md` §8.1/§8.3 and `ADR-011-ocr-provider-abstraction.md` for the full rationale.)**

API:

```text
POST https://api.ocr.space/parse/image
Auth header: apikey: <OCR_SPACE_API_KEY>
```

Accessed exclusively through an internal `OCRService` → `OcrSpaceProvider` abstraction (never called directly by the frontend), so the concrete provider can be swapped later without touching the rest of the document-processing pipeline.

## Purpose

Convert regulatory documents/images into machine-readable text.

```text
PDF / Document
      ↓
OCR.space
      ↓
OCR Data
```

The OCR output then moves into document cleaning.

The PRD requires an OCR stage after a new file is detected.

---

# 11. SHA-256

## Technology

**SHA-256**

## Purpose

SHA-256 creates a deterministic cryptographic fingerprint of a document.

For Gapture, it should be used for:

- duplicate detection
- document identification
- integrity verification
- version/change detection

Example:

```text
Regulatory PDF
      ↓
SHA-256
      ↓
9a72...e381
```

If the same document is downloaded again:

```text
Same content
    ↓
Same SHA-256
    ↓
Duplicate
```

If the content changes:

```text
Changed content
      ↓
Different SHA-256
      ↓
Potential new version
```

## Important distinction

SHA-256 is **hashing**, not encryption.

The PRD requires the SHA-256/encryption stage but leaves the exact cryptographic implementation open.

---

# 12. Encryption

## MVP recommendation

Use:

**AES-256 for encrypted document storage**

The SHA-256 hash and encryption serve different purposes.

```text
Document
 ├── SHA-256 → fingerprint
 │
 └── AES-256 → confidentiality
```

For the MVP, encryption should primarily protect stored original regulatory documents.

A more sophisticated enterprise KMS can be introduced later.

---

# 13. Original Document Storage

## Technology

**Supabase Storage**

The original regulatory file should be stored separately from OCR text.

```text
Original PDF
     ↓
Encryption
     ↓
Supabase Storage
```

The PRD explicitly distinguishes the original document from OCR-processed data.

### Suggested storage structure

```text
regulatory-documents/
    rbi/
        2026/
    sebi/
        2026/
```

---

# 14. Document Cleaning

## Technology

**Node.js + TypeScript**

No separate AI service is required.

The cleaning pipeline prepares OCR output for downstream AI processing.

Possible MVP operations:

1. Remove OCR noise.
2. Normalize whitespace.
3. Remove unnecessary repeated characters.
4. Preserve headings.
5. Preserve paragraphs.
6. Preserve important numbering.
7. Preserve regulatory section structure.
8. Normalize tables where practical.
9. Split content into meaningful sections.

The PRD deliberately does not mandate specific cleaning techniques.

---

# 15. Document Chunking

After cleaning, documents should be divided into manageable semantic sections.

```text
Clean Document
      ↓
Section Detection
      ↓
Chunking
      ↓
Embeddings
```

Chunks should preferably follow meaningful regulatory boundaries rather than blindly splitting text.

For example:

```text
Document
 ├── Section 1
 ├── Section 2
 ├── Section 3
 ├── Section 4
 └── Annexure
```

---

# 16. Vector Database

## Selected Technology

**Pinecone**

Pinecone will be used specifically for vector storage and semantic retrieval.

It is **not** the primary application database.

### Responsibilities

Pinecone stores embeddings representing:

- regulatory document chunks
- company compliance policy chunks
- relevant contextual information

### Architecture

```text
Regulatory Text
      ↓
Embedding Model
      ↓
Pinecone
```

and:

```text
Company Policy
      ↓
Embedding Model
      ↓
Pinecone
```

---

# 17. Why PostgreSQL + Pinecone?

The architecture uses two different data systems because they solve different problems.

## PostgreSQL / Supabase

Stores structured application data:

```text
Users
Organizations
Regulatory Documents
Document Metadata
NLP Results
Notifications
Questions
Conversations
```

## Pinecone

Stores semantic vector representations:

```text
Regulatory Chunks
Policy Chunks
Embeddings
Metadata
```

Therefore:

```text
Supabase/PostgreSQL
        +
     Pinecone
```

rather than trying to force all application and vector workloads into one database.

---

# 18. Company Compliance Policies

The PRD requires company compliance policies to be used as the comparison context but deliberately leaves their exact storage/training/versioning implementation unspecified.

## MVP implementation

Company policies can be:

```text
Policy Document
      ↓
Text Extraction
      ↓
Cleaning
      ↓
Chunking
      ↓
Embeddings
      ↓
Pinecone
```

The associated metadata can be stored in Supabase.

Example:

```text
Supabase
    ↓
Policy ID
Company ID
Policy Name
Version
File Reference
Created Date
```

Pinecone:

```text
Policy Chunk
Embedding
Company ID
Policy ID
Version
```

---

# 19. NLP / AI Engine

## Selected Technology

**OpenAI API**

OpenAI will provide the primary language intelligence layer.

The NLP system performs:

- regulatory document analysis
- policy comparison
- information extraction
- concise output generation
- detailed analysis
- summary generation
- contextual question answering

The PRD defines NLP as the stage that analyzes OCR data and compares it against company compliance policies.

---

# 20. RAG Architecture

The contextual AI layer will use a Retrieval-Augmented Generation approach.

```text
User / Regulatory Document
          ↓
      Query / Context
          ↓
       Pinecone
          ↓
 Relevant document chunks
          +
 Relevant policy chunks
          ↓
       OpenAI
          ↓
     AI Response
```

This prevents the LLM from having to rely solely on the model's general knowledge.

The response is grounded in the relevant Gapture context.

---

# 21. Regulatory Analysis Flow

```text
New RBI/SEBI Document
        ↓
       OCR
        ↓
Document Cleaning
        ↓
     Chunking
        ↓
    Embeddings
        ↓
     Pinecone
        ↓
Retrieve Relevant Company Policy
        ↓
     OpenAI
        ↓
   Comparison
        ↓
 ┌──────┼──────┐
 ↓      ↓      ↓
1-Line Detailed Summary
```

---

# 22. Three Required AI Outputs

The PRD requires three outputs.

## 22.1 1-Line

Purpose:

**Notification title**

Example:

```text
RBI updates KYC requirements for regulated entities.
```

## 22.2 Summary

Purpose:

**Notification description**

Example:

```text
The RBI has introduced updated KYC requirements that affect customer due diligence procedures.
```

## 22.3 Detailed

Purpose:

**Detailed regulatory information shown after notification click**

Example structure:

```text
What changed
Why it matters
Relevant requirement
Affected policy area
Relevant company policy context
Detailed explanation
```

The relationship is explicitly defined in the PRD: 1-Line → notification title, Summary → notification description, Detailed → detailed view/brief.

---

# 23. Supabase Backend

## Technology

**Supabase**

Supabase provides:

- PostgreSQL
- authentication
- storage
- database access
- backend services

The PRD explicitly requires one Supabase Backend.

### Conceptual architecture

```text
                SUPABASE
        ┌──────────┼──────────┐
        ↓          ↓          ↓
 PostgreSQL      Auth      Storage
        ↓
 Application Data
```

---

# 24. Proposed PostgreSQL Data Model

The following is an architecture proposal, because the PRD does not prescribe a database schema.

## users

```text
id
email
name
organization_id
created_at
```

## organizations

```text
id
name
created_at
```

## regulatory_sources

```text
id
name
type
source_url
active
```

Example:

```text
RBI
SEBI
```

## regulatory_documents

```text
id
source_id
title
document_url
publication_date
sha256_hash
storage_path
status
created_at
```

## document_processing

```text
id
document_id
ocr_status
cleaning_status
embedding_status
nlp_status
created_at
```

## compliance_policies

```text
id
organization_id
name
version
storage_path
created_at
```

## nlp_results

```text
id
document_id
one_line
summary
detailed
created_at
```

## notifications

```text
id
user_id
document_id
title
description
read
created_at
```

## questions

```text
id
user_id
document_id
question
answer
created_at
```

---

# 25. Notification System

## MVP Decision

**In-app notifications**

No separate notification provider is required initially.

The PRD does not mandate a particular notification technology.

### Notification structure

```text
Title
=
1-Line NLP Output
```

```text
Description
=
Summary NLP Output
```

When clicked:

```text
Notification
      ↓
Regulatory View
      ↓
Brief of Detailed NLP Data
```

This directly follows the PRD behaviour.

---

# 26. Authentication

## Technology

**Supabase Auth**

This avoids introducing another authentication provider.

### Basic flow

```text
User
 ↓
Login
 ↓
Supabase Auth
 ↓
Authenticated Session
 ↓
Next.js Application
```

---

# 27. Voice Interaction

## Selected Technology

**ElevenLabs API**

The PRD requires:

```text
Voice Button
      ↓
11Labs
      ↓
LLM
```

The exact ElevenLabs implementation is intentionally left open in the PRD.

### MVP implementation

Use ElevenLabs for the voice/audio component while keeping the language intelligence in OpenAI.

---

# 28. Contextual AI Questions

The contextual question flow is:

```text
User opens regulatory item
          ↓
Relevant regulatory context
          ↓
Voice Button
          ↓
ElevenLabs
          ↓
Question
          ↓
Retrieve context
          ↓
Pinecone
          ↓
OpenAI
          ↓
Contextual answer
```

The answer should be based on the regulatory information currently being viewed and relevant company policy context.

The PRD explicitly requires contextual question handling.

---

# 29. Speech-to-Text

## MVP Decision

Use the **OpenAI integration** rather than adding a separate speech provider.

Reason:

- fewer technologies
- fewer API credentials
- simpler backend
- easier maintenance
- existing OpenAI integration
- suitable for MVP

The exact speech-to-text implementation is an architecture decision and is not separately mandated by the PRD.

---

# 30. Mobile Application

The PRD specifies:

```text
Mobile App
    ↓
App Shell Architecture
    ↓
WebView Container
    ↓
WebView
```

It does not specify a mobile framework.

## MVP recommendation

Use a lightweight WebView-based wrapper around the responsive Next.js application.

The important goal is:

```text
ONE WEB APPLICATION
        ↓
MOBILE WEBVIEW
```

rather than creating an entirely separate native application.

---

# 31. Hosting

## Web Application

**Vercel**

Used for:

- Next.js deployment
- frontend hosting
- web application delivery

## Background Worker

A separate Node.js hosting environment should run:

```text
Source Monitoring Worker
```

The worker must be independent from the web application's request/response lifecycle.

---

# 32. Git and Development

## Technology

**Git + GitHub**

Recommended repository structure:

```text
gapture/
│
├── apps/
│   └── web/
│
├── workers/
│   └── regulatory-monitor/
│
├── packages/
│   ├── database/
│   ├── ai/
│   └── shared/
│
└── README.md
```

For the MVP, this can also begin as a simpler monorepo structure.

---

# 33. Environment Variables

API keys must never be placed directly in source code.

Example:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY

SUPABASE_SERVICE_ROLE_KEY

OPENAI_API_KEY

PINECONE_API_KEY
PINECONE_INDEX_NAME

ELEVENLABS_API_KEY

OCR_SPACE_API_KEY
```

Secret keys should remain server-side.

---

# 34. End-to-End Processing Pipeline

## Stage 1 — Monitoring

```text
RBI / SEBI
    ↓
RSS / Web Fetch
    ↓
Monitoring Worker
```

## Stage 2 — Detection

```text
Scraped Information
        ↓
Watchdog
        ↓
New File?
```

## Stage 3 — Document Processing

```text
New File
   ↓
OCR.space
   ↓
OCR Data
```

## Stage 4 — Security and Storage

```text
Original File
    ↓
SHA-256
    ↓
Encryption
    ↓
Supabase Storage
```

## Stage 5 — Cleaning

```text
OCR Data
    ↓
Cleaning
    ↓
Structured Text
```

## Stage 6 — Semantic Indexing

```text
Cleaned Text
     ↓
Chunking
     ↓
OpenAI Embeddings
     ↓
Pinecone
```

## Stage 7 — Policy Comparison

```text
Regulatory Context
        +
Company Policy Context
        ↓
     Pinecone
        ↓
Relevant Context
        ↓
      OpenAI
```

## Stage 8 — Output

```text
OpenAI
  ↓
┌───────────────┐
│ 1-Line        │
│ Detailed      │
│ Summary       │
└───────────────┘
```

## Stage 9 — Application

```text
NLP Outputs
    ↓
Supabase
    ↓
Next.js
```

## Stage 10 — Notification

```text
1-Line
   ↓
Notification Title

Summary
   ↓
Notification Description
```

## Stage 11 — User Interaction

```text
Notification
      ↓
User Clicks
      ↓
Regulatory View
      ↓
Detailed Brief
```

## Stage 12 — Voice AI

```text
Voice Button
     ↓
ElevenLabs
     ↓
Question
     ↓
Pinecone Context Retrieval
     ↓
OpenAI
     ↓
Contextual Answer
```

---

# 35. Complete Technology Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                    REGULATORY SOURCES                        │
│                         RBI / SEBI                            │
└────────────────────────────┬─────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────┐
│              NODE.JS MONITORING WORKER                       │
│                                                              │
│              RSS + Web Fetching                              │
│              Watchdog Extraction                             │
│              Continuous Monitoring                            │
└────────────────────────────┬─────────────────────────────────┘
                             ↓
                       FILE FOUND?
                      /          \
                    NO            YES
                    ↓              ↓
              Monitoring       OCR.space
                  Loop              ↓
                              OCR Data
                                  ↓
                         Document Cleaning
                                  ↓
                     ┌────────────┴────────────┐
                     ↓                         ↓
              Regulatory Data          Company Policies
                     ↓                         ↓
              OpenAI Embeddings         OpenAI Embeddings
                     ↓                         ↓
                     └────────────┬────────────┘
                                  ↓
                              PINECONE
                                  ↓
                         Relevant Context
                                  ↓
                             OPENAI API
                                  ↓
                    ┌─────────────┼─────────────┐
                    ↓             ↓             ↓
                 1-LINE       DETAILED       SUMMARY
                    ↓             ↓             ↓
                 TITLE           VIEW       DESCRIPTION
                    └─────────────┼─────────────┘
                                  ↓
                         SUPABASE BACKEND
                     ┌────────────┼────────────┐
                     ↓            ↓            ↓
                PostgreSQL      Auth        Storage
                     ↓
                  NEXT.JS
                     ↓
                WEB APPLICATION
                     ↓
                NOTIFICATION
                     ↓
                   VIEW
                     ↓
              DETAILED BRIEF
                     ↓
               VOICE BUTTON
                     ↓
                ELEVENLABS
                     ↓
              CONTEXTUAL QUESTION
                     ↓
                   PINECONE
                     ↓
                  OPENAI
                     ↓
                   ANSWER
```

---

# 36. Technology Responsibility Matrix

| Technology | Responsibility |
|---|---|
| Next.js | Web UI |
| TypeScript | Application language |
| Node.js | Backend processing |
| RSS | Regulatory feed tracking |
| Web Fetching | Regulatory source retrieval |
| Watchdog | New-file detection |
| OCR.space | OCR processing |
| SHA-256 | Document fingerprint |
| AES-256 | Document confidentiality |
| Supabase Storage | Original document storage |
| Document Cleaner | OCR preprocessing |
| OpenAI Embeddings | Vector representation |
| Pinecone | Semantic retrieval |
| OpenAI LLM | Regulatory analysis and Q&A |
| PostgreSQL | Structured application data |
| Supabase Auth | Authentication |
| Supabase | Backend platform |
| ElevenLabs | Voice/audio interaction |
| Vercel | Web hosting |
| GitHub | Source control |
| WebView | Mobile application shell |

---

# 37. What Is Required vs Architecture Decision

## Defined by the PRD

These are functional requirements:

- RBI monitoring
- SEBI monitoring
- continuous monitoring
- backend source monitoring
- Watchdog Extraction
- file-found decision
- OCR
- SHA-256/encryption stage
- original document storage
- document cleaning
- NLP
- company compliance policy comparison
- 1-line output
- detailed output
- summary output
- one Supabase Backend
- Web Application
- notification
- notification title = 1-line
- notification description = summary
- notification click/view
- detailed brief
- Voice Button
- ElevenLabs
- contextual LLM
- mobile WebView path

These are directly defined in the PRD.

## Architecture Decisions

These are selected implementation technologies:

- Next.js
- TypeScript
- Node.js
- PostgreSQL
- Supabase Storage
- Supabase Auth
- Pinecone
- OpenAI
- OCR.space
- ElevenLabs
- Vercel
- RSS implementation
- AES-256
- GitHub
- WebView wrapper
- in-app notifications

The PRD intentionally leaves infrastructure choices such as OCR engine, LLM provider, database schema, API architecture, encryption algorithm, KMS, notification provider and mobile framework open.

---

# 38. Simplified MVP Philosophy

The first Gapture version should focus on proving one complete loop:

```text
REGULATORY CHANGE
       ↓
DETECT
       ↓
EXTRACT
       ↓
UNDERSTAND
       ↓
COMPARE WITH POLICY
       ↓
GENERATE INSIGHT
       ↓
NOTIFY USER
       ↓
ANSWER QUESTIONS
```

The MVP does not need to become a large enterprise infrastructure project.

---

# 39. Explicitly Avoided Technologies for MVP

The following are intentionally not required:

```text
Kubernetes
Kafka
Redis
RabbitMQ
Microservice Mesh
AWS KMS
Auth0
Clerk
Twilio
SendGrid
Firebase
Separate STT Provider
Separate Vector Database + Cache
Multiple Application Databases
```

They may become relevant at scale, but they are unnecessary for demonstrating the FT-07 workflow.

---

# 40. MVP Stack — Final Version

```text
FRONTEND
Next.js
TypeScript

BACKEND
Node.js
TypeScript

DATABASE
PostgreSQL
Supabase

AUTH
Supabase Auth

STORAGE
Supabase Storage

REGULATORY MONITORING
RSS
Node.js Web Fetching

OCR
OCR.space

HASHING
SHA-256

ENCRYPTION
AES-256

VECTOR DATABASE
Pinecone

EMBEDDINGS
OpenAI Embeddings

LLM
OpenAI API

VOICE
ElevenLabs API

NOTIFICATIONS
In-App Notifications

MOBILE
WebView-based App Shell

HOSTING
Vercel + Node.js Worker Hosting

SOURCE CONTROL
Git + GitHub
```

---

# 41. Final Architecture Decision

The recommended Gapture MVP architecture is therefore:

```text
                 Gapture
                    │
       ┌────────────┴────────────┐
       │                         │
  Next.js Web              Node.js Worker
       │                         │
       │                    RBI / SEBI
       │                         │
       │                       RSS
       │                         ↓
       │                      Watchdog
       │                         ↓
       │                    OCR.space
       │                         ↓
       │                  SHA-256 + AES
       │                         ↓
       │                 Supabase Storage
       │                         ↓
       │                 Document Cleaning
       │                         ↓
       │                    Embeddings
       │                         ↓
       │                      Pinecone
       │                         ↓
       │                       OpenAI
       │                         ↓
       │               1-Line / Detailed /
       │                     Summary
       │                         ↓
       └──────────────────→ Supabase
                                  ↓
                             Web App
                                  ↓
                            Notification
                                  ↓
                                View
                                  ↓
                           Voice Button
                                  ↓
                             ElevenLabs
                                  ↓
                               OpenAI
                                  ↓
                         Contextual Answer
```

**Core architectural principle:**

> **Supabase is the application backend and PostgreSQL system of record. Pinecone is the semantic retrieval layer. OpenAI is the intelligence layer. OCR.space provides OCR. ElevenLabs provides voice. Node.js runs the continuous regulatory monitoring. Next.js provides the user experience.**

This keeps the architecture aligned with the FT-07 workflow while avoiding unnecessary infrastructure complexity.