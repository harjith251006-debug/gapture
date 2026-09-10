# Gapture — FT-07
## Business Requirements Document (BRD)

**Product:** Gapture  
**Project:** FT-07 — Regulatory Compliance Intelligence Platform  
**Tagline:** Gaps, Captured.  
**Document Type:** Business Requirements Document  
**Source PRD:** FT-07 Master Product Requirements Document v1.1  
**Document Status:** Draft / Architecture-Aligned  
**Scope:** RBI and SEBI only  
**Target:** MVP / Hackathon Implementation  
**Date:** 10 September 2026

---

# 1. Document Control

| Field | Value |
|---|---|
| Product | Gapture |
| Project | FT-07 |
| Document | Business Requirements Document |
| Version | 1.0 |
| Status | Draft |
| Functional Source of Truth | FT-07 Master PRD v1.1 |
| Architecture Reference | Gapture Technology Stack & Architecture |
| Regulatory Sources | RBI, SEBI |
| FIU | Explicitly excluded |
| Target Release | MVP |

## 1.1 Purpose

This BRD translates the approved FT-07 workflow into business requirements and business-process definitions.

The Master PRD remains the functional source of truth. This BRD does not introduce a new product workflow or replace requirements from the PRD.

The approved technology stack is used only to describe the intended implementation context.

---

# 2. Executive Summary

Gapture is a regulatory monitoring and AI-assisted compliance information platform designed to continuously monitor official RBI and SEBI sources for newly published regulatory notifications and files.

When a new regulatory file is detected, Gapture processes the document through OCR, SHA-256/encryption processing, original-document storage, document cleaning, and NLP. The NLP stage analyzes the regulatory information and compares it with company compliance policies.

The system produces three forms of regulatory intelligence:

1. **1-Line Output** — concise information used as the notification title.
2. **Detailed Output** — detailed regulatory information used to provide the user with a detailed brief.
3. **Summary Output** — concise summary used as the notification description.

The processed information is made available through a single Supabase Backend and the Gapture Web Application.

Users receive a notification, open the relevant regulatory information, review the detailed brief, and can initiate the defined voice/contextual AI interaction. The voice flow uses ElevenLabs and contextual LLM processing.

The mobile experience follows the defined:

```text
Mobile App
→ App Shell Architecture
→ WebView Container
→ WebView
```

The business objective is to transform continuously monitored regulatory publications into accessible, structured, company-contextual compliance information.

---

# 3. Business Background

Regulatory information is continuously published by regulatory authorities. FT-07 defines a system that continuously monitors RBI and SEBI sources and automatically processes newly detected regulatory files.

The platform is intended to reduce the operational effort required to identify new regulatory documents, understand their content, compare them against company compliance policies, and consume the resulting information.

The PRD defines RBI and SEBI as the only current regulatory sources. FIU has been explicitly removed from the project.

No unsupported market-size, customer, regulatory-impact, or financial claims are made in this BRD.

---

# 4. Business Problem Statement

## 4.1 Problem

The current FT-07 business problem is represented by the need to continuously:

- monitor RBI and SEBI regulatory sources;
- identify newly available regulatory files;
- process regulatory documents;
- convert document content into usable information;
- analyze regulatory information in the context of company compliance policies;
- generate concise and detailed outputs;
- notify users of relevant new information;
- provide contextual access to the resulting information.

Without an automated workflow, these activities would require repeated manual monitoring and information processing.

## 4.2 Business Need

Gapture therefore needs to provide a continuous regulatory-information pipeline:

```text
Monitor
  ↓
Detect
  ↓
Process
  ↓
Analyze
  ↓
Compare
  ↓
Summarize
  ↓
Notify
  ↓
Explain / Answer
```

---

# 5. Business Vision

The vision for FT-07 is to provide a single platform through which users can receive and understand newly published RBI and SEBI regulatory information in relation to their company's compliance-policy context.

The core value proposition is:

> **Gapture continuously captures regulatory information and turns it into actionable, contextual compliance intelligence for users.**

The word "actionable" here refers to usable information and contextual understanding. The current PRD does not define automated remediation or automated compliance decisions.

---

# 6. Business Objectives

## BO-01 — Continuous Regulatory Monitoring

Continuously monitor RBI and SEBI sources for new notifications/files.

## BO-02 — New File Detection

Identify whether a newly available regulatory file has been found.

## BO-03 — Regulatory Document Processing

Process detected documents through OCR, SHA-256/encryption, original-document preservation, and document cleaning.

## BO-04 — Compliance Intelligence

Analyze processed regulatory information against company compliance policies.

## BO-05 — Structured Information Generation

Generate:

- 1-line information;
- detailed information;
- summary information.

## BO-06 — Information Availability

Make processed regulatory information available through the Gapture application.

## BO-07 — User Notification

Notify users when new processed regulatory information becomes available.

## BO-08 — Contextual Interaction

Allow users to interact with relevant regulatory information through the defined voice and contextual LLM flow.

## BO-09 — Mobile Accessibility

Provide the defined WebView-based mobile experience.

---

# 7. Business Scope

## 7.1 In Scope

The FT-07 business scope includes:

- RBI regulatory monitoring;
- SEBI regulatory monitoring;
- Source Monitoring Platform;
- backend source monitoring;
- RSS feed tracking where applicable;
- web retrieval/scraping of relevant source information;
- Watchdog Extraction;
- new-file decision;
- continuous monitoring loop;
- OCR;
- SHA-256;
- encryption;
- original-document storage;
- document cleaning;
- NLP;
- company compliance policy comparison;
- 1-line output;
- detailed output;
- summary output;
- single Supabase Backend;
- Web Application;
- user notification;
- notification title and description;
- notification click/view;
- detailed information brief;
- Voice Button;
- ElevenLabs;
- contextual LLM question handling;
- mobile App Shell;
- WebView Container;
- WebView.

---

# 8. Out of Scope

The following are explicitly outside the current FT-07 scope:

- FIU monitoring;
- regulatory sources other than RBI and SEBI unless separately approved;
- automated compliance-gap classification;
- risk scoring;
- risk hierarchy;
- remediation management;
- compliance status classification;
- evidence management;
- audit management;
- regulatory change comparison;
- clause-level comparison;
- knowledge graphs;
- control mapping;
- department mapping;
- policy drift detection.

These must not be treated as current business requirements.

---

# 9. Stakeholders

The source documentation does not define a complete organizational stakeholder map. The following are therefore proposed business stakeholder categories derived from the workflow.

| Stakeholder | Role | Interest |
|---|---|---|
| Compliance User | Consumes regulatory intelligence | Understand relevant regulatory information |
| Company User | Uses company-policy context | Understand regulatory relevance |
| Business Stakeholder | Reviews platform output | Obtain regulatory information efficiently |
| Platform Administrator | Supports platform operation | Maintain source/application configuration |
| Technical/Operations Team | Maintains system | Keep monitoring and processing operational |

Specific organizational titles, approval authorities, and ownership structures remain **TBD** unless separately defined.

---

# 10. User Personas

## 10.1 Compliance User

### Goal

Understand newly published RBI and SEBI regulatory information and its relationship to company compliance policies.

### Gapture Usage

- receives notification;
- opens regulatory information;
- reads summary/detailed information;
- asks contextual questions.

### Expected Outcome

Faster access to relevant regulatory information.

---

## 10.2 Company User

### Goal

Understand regulatory information in relation to company policy context.

### Gapture Usage

- reviews regulatory intelligence;
- accesses detailed information;
- uses contextual AI interaction.

### Expected Outcome

Improved access to company-contextual regulatory information.

---

## 10.3 Platform Administrator

### Goal

Maintain the operational platform.

### Gapture Usage

The exact administrative capabilities are not defined in the current PRD.

### Status

**Proposed persona — administrative requirements TBD.**

---

# 11. End-to-End Business Process

## 11.1 Process Overview

```text
RBI / SEBI
    ↓
Regulatory Monitoring
    ↓
New File Detection
    ↓
Document Processing
    ↓
Regulatory Intelligence
    ↓
Company Policy Comparison
    ↓
Information Generation
    ↓
Application Delivery
    ↓
User Notification
    ↓
Detailed View
    ↓
Contextual AI
```

---

# 12. Business Process 1 — Regulatory Monitoring

## Objective

Continuously identify newly available regulatory information from RBI and SEBI.

## Process

```text
RBI
SEBI
 ↓
Source Monitoring Platform
 ↓
RSS / Web Retrieval
```

## Business Requirement

The platform shall continuously monitor RBI and SEBI sources.

## Business Outcome

New regulatory files can be identified without requiring users to manually initiate each monitoring cycle.

---

# 13. Business Process 2 — Watchdog Extraction

## Objective

Determine whether the monitoring process has identified a relevant new file.

```text
Source Monitoring
       ↓
Watchdog Extraction
       ↓
File Found?
```

## Decision

### No

```text
NO
 ↓
Continuous Monitoring Loop
```

### Yes

```text
YES
 ↓
Document Processing
```

---

# 14. Business Process 3 — Continuous Monitoring

If no new regulatory file is found, the platform must continue monitoring.

```text
Watchdog
   ↓
No File
   ↓
Monitoring Loop
   ↓
RBI / SEBI
```

The absence of a new file must not terminate the overall monitoring service.

---

# 15. Business Process 4 — Regulatory Document Processing

When a new file is detected:

```text
New Regulatory File
       ↓
OCR
       ↓
SHA-256 / Encryption
       ↓
Store Original
```

The original regulatory document must remain a separate preserved artifact.

The current storage branch then terminates, while the overall monitoring system continues operating.

---

# 16. Business Process 5 — Document Intelligence

The OCR data proceeds through:

```text
OCR Data
   ↓
Document Cleaning
   ↓
NLP
```

The purpose of document cleaning is to prepare extracted information for intelligence processing.

---

# 17. Business Process 6 — Company Policy Comparison

The central intelligence process is:

```text
Regulatory OCR Data
        +
Company Compliance Policies
        ↓
       NLP
```

The system analyzes regulatory information and compares it with the available company compliance-policy context.

The current PRD does not define a specific policy-training methodology.

---

# 18. Business Process 7 — Intelligence Generation

NLP generates three outputs:

```text
                  NLP
             /     |      \
            ↓      ↓       ↓
         1-Line Detailed Summary
```

### 18.1 1-Line

Provides a concise representation of the regulatory information.

### 18.2 Detailed

Provides detailed regulatory information.

### 18.3 Summary

Provides a concise summary.

---

# 19. Business Process 8 — Information Delivery

The outputs are made available through the single Supabase Backend:

```text
1-Line
Detailed
Summary
   ↓
Supabase Backend
   ↓
Web Application
```

The Web Application is the primary user-facing experience.

---

# 20. Business Process 9 — Notification

When new processed regulatory information becomes available, the user is notified.

## Notification structure

```text
TITLE
=
1-Line NLP Output
```

```text
DESCRIPTION
=
Summary NLP Output
```

The current MVP uses in-application notification functionality rather than introducing a separate notification provider.

The exact external notification delivery channels are not mandated by the PRD.

---

# 21. Business Process 10 — Notification View

The user selects the notification:

```text
Notification
     ↓
User Clicks
     ↓
View
     ↓
Detailed Regulatory Information
```

The system provides a brief representation of the detailed NLP data.

---

# 22. Business Process 11 — Contextual AI

The user can initiate the voice interaction from the regulatory-information view.

```text
View
 ↓
Voice Button
 ↓
ElevenLabs
 ↓
LLM
 ↓
Contextual Questions
```

The LLM must handle questions with respect to the relevant regulatory context.

The contextual interaction is not intended to create an unrelated general-purpose conversation outside the relevant information context.

---

# 23. Business Process 12 — Mobile

The mobile experience follows:

```text
Mobile App
     ↓
App Shell Architecture
     ↓
WebView Container
     ↓
WebView
```

The mobile experience is intended to provide the web application within the defined mobile shell.

No separate native regulatory-processing workflow is required by the current PRD.

---

# 24. Business Requirements Catalogue

| ID | Requirement | Priority |
|---|---|---|
| BR-001 | Monitor RBI | Must Have |
| BR-002 | Monitor SEBI | Must Have |
| BR-003 | Continuously monitor regulatory sources | Must Have |
| BR-004 | Detect newly available files | Must Have |
| BR-005 | Return to monitoring when no file is found | Must Have |
| BR-006 | Process detected files through OCR | Must Have |
| BR-007 | Apply SHA-256 processing | Must Have |
| BR-008 | Apply encryption | Must Have |
| BR-009 | Preserve original documents | Must Have |
| BR-010 | Clean OCR data | Must Have |
| BR-011 | Analyze regulatory information using NLP | Must Have |
| BR-012 | Compare regulatory information with company policies | Must Have |
| BR-013 | Generate 1-line output | Must Have |
| BR-014 | Generate detailed output | Must Have |
| BR-015 | Generate summary output | Must Have |
| BR-016 | Store/serve outputs through single Supabase Backend | Must Have |
| BR-017 | Provide Web Application | Must Have |
| BR-018 | Notify users | Must Have |
| BR-019 | Use 1-line output as notification title | Must Have |
| BR-020 | Use summary as notification description | Must Have |
| BR-021 | Open relevant information from notification | Must Have |
| BR-022 | Provide detailed brief | Must Have |
| BR-023 | Provide Voice Button | Must Have |
| BR-024 | Trigger ElevenLabs | Must Have |
| BR-025 | Handle contextual LLM questions | Must Have |
| BR-026 | Provide mobile WebView experience | Must Have |

---

# 25. Detailed Business Requirements

## BR-001 — RBI Monitoring

The system shall monitor RBI regulatory sources for newly available regulatory notifications/files.

**Business rationale:** Provide continuous access to new RBI regulatory information.

**Acceptance criteria:**

- RBI is configured as a monitored source.
- Monitoring occurs through the backend monitoring process.
- Newly available regulatory information can enter the processing workflow.

---

## BR-002 — SEBI Monitoring

The system shall monitor SEBI regulatory sources for newly available regulatory notifications/files.

**Business rationale:** Provide continuous access to new SEBI regulatory information.

**Acceptance criteria:**

- SEBI is configured as a monitored source.
- Monitoring occurs through the backend monitoring process.
- Newly available regulatory information can enter the processing workflow.

---

## BR-003 — Continuous Monitoring

The system shall continuously monitor RBI and SEBI.

**Acceptance criteria:**

- Monitoring operates independently of manual user initiation.
- Monitoring continues after a cycle in which no file is found.

---

## BR-004 — New File Detection

The system shall determine whether a relevant new regulatory file has been found.

**Acceptance criteria:**

- Monitoring output reaches Watchdog Extraction.
- Watchdog produces a file-found decision.
- The decision has YES and NO paths.

---

## BR-005 — No-File Loop

If no new file is detected, the system shall return to the continuous monitoring loop.

**Acceptance criteria:**

```text
NO
 ↓
Monitoring Loop
```

---

## BR-006 — OCR Processing

A newly detected regulatory file shall be processed through OCR.

**Business outcome:** Convert document content into machine-readable information for subsequent processing.

---

## BR-007 — SHA-256

The document shall pass through the SHA-256 stage.

**MVP business purpose:**

- document fingerprinting;
- duplicate detection;
- integrity support;
- change/version identification.

SHA-256 is a hashing mechanism and is distinct from encryption.

---

## BR-008 — Encryption

The document shall pass through an encryption stage before original storage.

**MVP architecture decision:** AES-256 is the recommended encryption mechanism for stored documents.

Exact enterprise key-management requirements remain outside the current PRD unless separately approved.

---

## BR-009 — Original Document Preservation

The original regulatory file shall be preserved separately from OCR data.

**Acceptance criteria:**

- Original file is stored.
- OCR data is treated as a separate processed representation.
- Original document remains retrievable according to application permissions.

---

## BR-010 — Document Cleaning

OCR data shall be prepared for NLP processing.

**Acceptance criteria:**

- OCR output enters document cleaning.
- Cleaned content enters NLP processing.

---

## BR-011 — NLP Analysis

The system shall analyze processed regulatory information.

---

## BR-012 — Company Policy Comparison

The system shall use company compliance policies as comparison context.

**Acceptance criteria:**

- Regulatory information is supplied to NLP.
- Company compliance-policy context is supplied to NLP.
- NLP generates the defined outputs.

---

## BR-013 — 1-Line Output

The system shall generate a 1-line representation.

**Business use:** Notification title.

---

## BR-014 — Detailed Output

The system shall generate detailed regulatory information.

**Business use:** Detailed regulatory view and detailed brief.

---

## BR-015 — Summary Output

The system shall generate a summary.

**Business use:** Notification description.

---

## BR-016 — Single Supabase Backend

The system shall use one Supabase Backend for the application data flow.

**Business outcome:** Maintain a single application backend/data-access boundary.

---

## BR-017 — Web Application

The system shall provide a Web Application through which users can access processed regulatory information.

---

## BR-018 — Notification

The system shall notify users when new processed regulatory information becomes available.

**MVP implementation:** In-app notification.

---

## BR-019 — Notification Title

The notification title shall be the 1-line NLP output.

---

## BR-020 — Notification Description

The notification description shall be the Summary NLP output.

---

## BR-021 — Notification Click

When the user clicks the notification, the system shall open the relevant regulatory information.

---

## BR-022 — Detailed Brief

The system shall provide a brief representation of the detailed NLP output after the regulatory information is opened.

---

## BR-023 — Voice Button

The Web Application shall provide a Voice Button within the relevant regulatory-information view.

---

## BR-024 — ElevenLabs

Activating the Voice Button shall initiate the defined ElevenLabs voice interaction.

---

## BR-025 — Contextual LLM

The system shall allow the LLM to handle user questions with respect to the relevant regulatory context.

**Acceptance criteria:**

- User question is associated with the relevant context.
- Context is supplied to the LLM.
- LLM returns a contextual response.

---

## BR-026 — Mobile Experience

The product shall provide the defined mobile path:

```text
Mobile App
→ App Shell
→ WebView Container
→ WebView
```

---

# 26. Business Rules

| Rule ID | Business Rule |
|---|---|
| RULE-001 | Only RBI and SEBI are current regulatory sources. |
| RULE-002 | FIU is excluded from FT-07. |
| RULE-003 | Monitoring must operate continuously. |
| RULE-004 | No-file detection returns the system to monitoring. |
| RULE-005 | New files enter the document-processing workflow. |
| RULE-006 | Original documents must be preserved separately from OCR data. |
| RULE-007 | 1-line output becomes the notification title. |
| RULE-008 | Summary output becomes the notification description. |
| RULE-009 | Notification click opens the relevant regulatory information. |
| RULE-010 | Detailed NLP output provides the basis for the detailed brief. |
| RULE-011 | Contextual LLM interaction must use relevant regulatory context. |
| RULE-012 | The current product does not automatically classify risk, assign compliance status, or manage remediation. |

---

# 27. Data Requirements

## 27.1 Regulatory Source

Represents:

- RBI
- SEBI

## 27.2 Regulatory File

A file detected by the monitoring process.

## 27.3 Original Document

The preserved original regulatory file.

## 27.4 OCR Data

Information extracted from the document.

## 27.5 Cleaned Document Data

Prepared OCR content used for NLP.

## 27.6 Company Compliance Policy

Company policy information used as comparison context.

## 27.7 NLP Result

The result of analysis and policy comparison.

## 27.8 1-Line Output

Concise NLP-generated information.

## 27.9 Detailed Output

Detailed NLP-generated information.

## 27.10 Summary Output

Summary NLP-generated information.

## 27.11 Notification

Contains:

- title;
- description;
- link/action to relevant regulatory information.

## 27.12 Detailed Brief

A brief representation derived from detailed NLP information.

## 27.13 Context

Relevant information used by the LLM.

## 27.14 User Question

A question asked through the contextual AI interaction.

---

# 28. Company Compliance Policy Requirements

Company compliance policies are a required comparison context.

The business flow is:

```text
Company Compliance Policies
          ↓
    Comparison Context
          ↓
          NLP
```

The current PRD does not define:

- policy file formats;
- policy upload mechanism;
- policy training mechanism;
- policy database structure;
- policy versioning;
- policy categories.

Therefore these remain:

**TBD / Architecture or Product Decision Required.**

For the MVP architecture, policy information may be stored in Supabase and semantically indexed in Pinecone for retrieval.

---

# 29. AI Business Requirements

## 29.1 Regulatory Understanding

The platform shall use AI/NLP to process regulatory document information.

## 29.2 Policy Context

The platform shall provide company compliance policies as comparison context.

## 29.3 Structured Outputs

AI processing shall produce:

- 1-line;
- detailed;
- summary.

## 29.4 Contextual Questions

The platform shall support questions related to the relevant regulatory context.

## 29.5 AI Boundaries

The current product does not require:

- automated legal advice;
- automated compliance decisions;
- risk scoring;
- remediation recommendations;
- automated compliance status classification;
- regulatory change comparison;
- clause-level comparison.

---

# 30. Notification Requirements

The notification business model is:

```text
NLP
 ↓
┌───────────────────────┐
│ 1-Line → Title        │
│ Summary → Description │
└───────────────────────┘
 ↓
Notification
 ↓
User Click
 ↓
Regulatory View
```

The MVP implementation uses in-app notification functionality.

Additional delivery channels such as email, SMS, browser push, WhatsApp, or mobile push are not current mandatory requirements.

---

# 31. Security and Document Handling

The business workflow requires:

```text
Document
   ↓
SHA-256
   ↓
Encryption
   ↓
Original Storage
```

## Business objectives

- preserve document identity;
- support duplicate detection;
- support integrity verification;
- protect stored original documents.

The exact enterprise cryptographic architecture, KMS, rotation policy, and key-management model are not defined in the Master PRD.

---

# 32. Technology Alignment

The following technologies are approved implementation choices for the MVP.

| Business Capability | Technology |
|---|---|
| Web Application | Next.js |
| Application Language | TypeScript |
| Backend Processing | Node.js + TypeScript |
| Application Database | PostgreSQL / Supabase |
| Authentication | Supabase Auth |
| File Storage | Supabase Storage |
| Regulatory Monitoring | RSS + Node.js web fetching |
| Watchdog | Node.js / TypeScript |
| OCR | OCR.space |
| Hashing | SHA-256 |
| Encryption | AES-256 |
| Vector Database | Pinecone |
| Embeddings | OpenAI Embeddings |
| NLP / LLM | OpenAI API |
| Voice | ElevenLabs API |
| Notifications | In-app |
| Mobile | WebView-based application shell |
| Web Hosting | Vercel |
| Source Control | Git + GitHub |

---

# 33. Technology-to-Business Mapping

```text
RBI / SEBI
    ↓
RSS / Web Fetching
    ↓
Node.js Monitoring Worker
    ↓
Watchdog
    ↓
OCR.space
    ↓
SHA-256 + AES-256
    ↓
Supabase Storage
    ↓
Document Cleaning
    ↓
OpenAI Embeddings
    ↓
Pinecone
    ↓
OpenAI LLM
    ↓
1-Line / Detailed / Summary
    ↓
Supabase PostgreSQL
    ↓
Next.js
    ↓
Notification
    ↓
View
    ↓
ElevenLabs
    ↓
OpenAI Contextual LLM
```

---

# 34. Application Data Responsibilities

## Supabase / PostgreSQL

Primary structured application data should include:

- users;
- organizations;
- regulatory sources;
- regulatory documents;
- document metadata;
- processing status;
- company compliance policies;
- NLP results;
- notifications;
- contextual questions;
- contextual answers.

## Supabase Storage

Stores:

- original regulatory documents;
- company policy documents where applicable.

## Pinecone

Stores semantic representations of:

- regulatory document chunks;
- company policy chunks;
- associated metadata.

Pinecone is the semantic retrieval layer, not the primary application database.

---

# 35. Business-Level AI Retrieval Model

The approved architecture uses semantic retrieval for contextual AI.

```text
Regulatory Document
        ↓
     Chunking
        ↓
    Embeddings
        ↓
     Pinecone
```

Company policy:

```text
Company Policy
      ↓
   Chunking
      ↓
  Embeddings
      ↓
   Pinecone
```

During analysis:

```text
Regulatory Context
       +
Company Policy Context
       ↓
Relevant Retrieval
       ↓
OpenAI
       ↓
Compliance Intelligence
```

During contextual Q&A:

```text
User Question
      ↓
Pinecone Retrieval
      ↓
Relevant Regulatory Context
      +
Relevant Policy Context
      ↓
OpenAI
      ↓
Contextual Answer
```

---

# 36. MVP Definition

The MVP must demonstrate the complete workflow from regulatory monitoring through contextual AI interaction.

## MVP Flow

```text
RBI / SEBI
     ↓
Monitoring
     ↓
File Detection
     ↓
OCR
     ↓
SHA-256 / Encryption
     ↓
Original Storage
     ↓
Cleaning
     ↓
NLP
     ↓
Company Policy Comparison
     ↓
1-Line / Detailed / Summary
     ↓
Supabase
     ↓
Web Application
     ↓
Notification
     ↓
View
     ↓
Detailed Brief
     ↓
Voice
     ↓
ElevenLabs
     ↓
Contextual LLM
```

---

# 37. MVP Simplification Decisions

To keep the implementation practical, the MVP intentionally avoids unnecessary infrastructure.

The MVP does not require:

- Kubernetes;
- Kafka;
- Redis;
- RabbitMQ;
- service mesh;
- multiple application databases;
- separate authentication platform;
- separate notification provider;
- separate vector database plus caching infrastructure;
- complex enterprise cloud infrastructure.

The objective is to prove the FT-07 business workflow rather than build a production-scale distributed system.

---

# 38. Non-Functional Business Expectations

The PRD does not specify numerical:

- response-time targets;
- uptime targets;
- server capacity;
- concurrent-user limits;
- scraping frequency;
- OCR processing time;
- NLP processing time;
- notification latency.

Therefore this BRD does not invent numerical targets.

The following qualitative expectations remain:

### Continuous Operation

Monitoring should operate continuously.

### Processing Continuity

A detected file should progress through the defined workflow.

### Contextual AI

AI responses should use the relevant regulatory context.

### Mobile Availability

The mobile experience should follow the WebView architecture.

---

# 39. Assumptions

The following are architecture assumptions for the MVP and should be validated before production deployment:

1. RBI and SEBI provide accessible source information through RSS or web pages.
2. Detected regulatory files can be retrieved by the monitoring worker.
3. OCR.space can process the required document types through the selected deployment/API method.
4. OpenAI services are available to the application.
5. ElevenLabs services are available for the voice workflow.
6. Pinecone is available for semantic retrieval.
7. Supabase can support the required MVP database and storage workload.
8. The selected worker hosting environment can execute continuous monitoring.
9. Company compliance policies can be supplied in a processable form.
10. The web application can be packaged or displayed through the selected WebView implementation.

These are implementation assumptions, not additional product requirements.

---

# 40. Dependencies

| Dependency | Description |
|---|---|
| RBI | Regulatory source |
| SEBI | Regulatory source |
| RSS / Web Access | Source monitoring |
| OCR.space | Document OCR |
| Supabase | Database, storage, authentication/backend |
| Pinecone | Vector retrieval |
| OpenAI | Embeddings and LLM |
| ElevenLabs | Voice interaction |
| Vercel | Web application hosting |
| Worker Hosting | Continuous monitoring execution |
| Company Policies | Comparison context |

---

# 41. Risks

## RISK-001 — Regulatory Source Changes

RBI or SEBI website structures may change.

**Impact:** Monitoring/detection may require updates.

**Mitigation:** Keep source-specific monitoring logic modular.

---

## RISK-002 — OCR Quality

Poor document quality may produce inaccurate OCR.

**Impact:** Downstream NLP quality can be affected.

**Mitigation:** Preserve original documents and validate OCR output before intelligence processing.

---

## RISK-003 — AI Interpretation

LLM-generated outputs may not perfectly represent regulatory content.

**Impact:** Incorrect or incomplete information could affect user understanding.

**Mitigation:** Ground outputs in processed regulatory content and relevant company-policy context.

---

## RISK-004 — API Availability

External services such as OCR.space, OpenAI, Pinecone, and ElevenLabs may experience availability or quota limitations.

**Mitigation:** Implement service-level error handling and processing-status tracking.

---

## RISK-005 — Policy Quality

The usefulness of policy comparison depends on the quality and completeness of company compliance-policy information.

**Mitigation:** Maintain clear policy ingestion and validation processes as the policy-management design evolves.

---

## RISK-006 — Continuous Worker Failure

The monitoring worker may stop unexpectedly.

**Mitigation:** Use worker health monitoring and restart mechanisms in deployment.

---

# 42. Error Handling Business Expectations

The Master PRD does not define separate product workflow states for errors.

However, the architecture should handle failures for:

- source monitoring;
- OCR;
- SHA-256;
- encryption;
- storage;
- document cleaning;
- NLP;
- Supabase;
- notification;
- ElevenLabs;
- LLM;
- WebView.

These should be implementation-level error-handling mechanisms and should not alter the defined business workflow.

---

# 43. Traceability Matrix

| Business Requirement | PRD Area |
|---|---|
| BR-001 RBI Monitoring | FR-01 |
| BR-002 SEBI Monitoring | FR-01 |
| BR-003 Continuous Monitoring | FR-05 |
| BR-004 File Detection | FR-03 / FR-04 |
| BR-005 No-File Loop | FR-05 |
| BR-006 OCR | FR-06 |
| BR-007 SHA-256 | FR-07 |
| BR-008 Encryption | FR-07 |
| BR-009 Original Storage | FR-08 |
| BR-010 Cleaning | FR-10 |
| BR-011 NLP | FR-11 |
| BR-012 Policy Comparison | FR-12 |
| BR-013 1-Line | FR-13 |
| BR-014 Detailed | FR-14 |
| BR-015 Summary | FR-15 |
| BR-016 Supabase | FR-17 |
| BR-017 Web Application | FR-18 |
| BR-018 Notification | FR-19 |
| BR-019 Notification Title | FR-20 |
| BR-020 Notification Description | FR-20 |
| BR-021 Notification Click | FR-20 |
| BR-022 Detailed Brief | FR-20 |
| BR-023 Voice Button | FR-21 |
| BR-024 ElevenLabs | FR-22 |
| BR-025 Contextual LLM | FR-23 |
| BR-026 Mobile | Sections 9–12 |

---

# 44. Business Success Criteria

For the MVP, success means demonstrating the complete FT-07 workflow.

## Success Criterion 1

The system can monitor RBI and SEBI.

## Success Criterion 2

The system can detect a newly available regulatory file.

## Success Criterion 3

The detected file can be processed through OCR.

## Success Criterion 4

The original document can be fingerprinted, protected, and stored.

## Success Criterion 5

OCR information can be cleaned and processed.

## Success Criterion 6

Regulatory information can be compared against company compliance-policy context.

## Success Criterion 7

The system generates:

- 1-line;
- detailed;
- summary.

## Success Criterion 8

The generated information is available through the Gapture Web Application.

## Success Criterion 9

The notification correctly uses:

```text
Title = 1-Line
Description = Summary
```

## Success Criterion 10

The user can open the regulatory information and see the detailed brief.

## Success Criterion 11

The user can initiate the voice interaction.

## Success Criterion 12

The contextual LLM can answer questions using the relevant regulatory context.

## Success Criterion 13

The same web experience can be accessed through the defined mobile WebView path.

---

# 45. Future Considerations

The following may be considered in future product versions, but are not current FT-07 requirements:

- additional regulatory sources;
- automated compliance-gap classification;
- risk scoring;
- risk hierarchy;
- remediation management;
- compliance status classification;
- evidence management;
- audit management;
- regulatory change comparison;
- clause-level comparison;
- knowledge graphs;
- control mapping;
- department mapping;
- policy drift detection.

Any future capability must be separately approved before becoming part of the FT-07 requirements.

---

# 46. Open Decisions / TBD

The following items remain open because they are not completely defined by the Master PRD.

| Area | Current Decision / Status |
|---|---|
| Exact OpenAI model selection | TBD |
| Exact OCR.space API/deployment method | TBD |
| Monitoring worker hosting provider | TBD |
| Exact RSS/source implementation | Architecture decision |
| Policy upload format | TBD |
| Policy versioning model | TBD |
| Enterprise KMS | TBD / not required for MVP |
| Exact mobile WebView wrapper | TBD |
| Production notification channels | TBD |
| Production monitoring/observability platform | TBD |
| Numerical performance targets | TBD |
| Production scaling architecture | TBD |

These open items do not prevent the MVP architecture from being implemented.

---

# 47. Final Business Architecture

```text
                         GAPTER
                           │
                 ┌─────────┴─────────┐
                 ↓                   ↓
             RBI / SEBI        Company Policies
                 ↓                   ↓
        Regulatory Monitoring      Policy Context
                 ↓                   ↓
              Watchdog               │
                 ↓                    │
            New File?                 │
            /      \                 │
          NO        YES               │
          ↓          ↓                │
       Monitor      OCR               │
                     ↓                │
              SHA-256 + Encryption    │
                     ↓                │
              Original Storage        │
                     ↓                │
               Clean Document        │
                     ↓                │
                     └──────┬─────────┘
                            ↓
                           NLP
                            ↓
                 ┌──────────┼──────────┐
                 ↓          ↓          ↓
              1-LINE     DETAILED    SUMMARY
                 ↓          ↓          ↓
               TITLE        VIEW    DESCRIPTION
                 └──────────┼──────────┘
                            ↓
                       SUPABASE
                            ↓
                       WEB APP
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
                      CONTEXTUAL LLM
                            ↓
                          ANSWER
```

---

# 48. Final Business Definition

**Gapture / FT-07 is a continuous regulatory monitoring and AI-assisted compliance information platform that monitors RBI and SEBI, detects newly available regulatory files, processes those documents through OCR and security/storage stages, cleans and analyzes the resulting information, compares it against company compliance policies, and generates 1-line, detailed, and summary regulatory intelligence. The platform makes that information available through a single Supabase Backend and Web Application, notifies users using the 1-line output as the notification title and the summary as the description, provides a detailed regulatory brief after notification interaction, and enables contextual voice/LLM interaction through the defined ElevenLabs and LLM flow. The mobile experience is delivered through a WebView-based application path.**

---

# 49. Document Governance

This BRD must be interpreted together with the FT-07 Master PRD.

Where a conflict exists:

**Master PRD → Functional requirement authority**

**Technology Stack → Implementation authority**

**BRD → Business interpretation and requirement organization**

No technology decision should silently create a new product capability.

No business requirement should silently alter the approved FT-07 workflow.

## Core Rule

> **Preserve the workflow. Define the business requirement. Implement the architecture around it.**

---

# 50. Approval

| Role | Name | Status | Date |
|---|---|---|---|
| Product Owner | TBD | Pending | TBD |
| Business Stakeholder | TBD | Pending | TBD |
| Technical Lead | TBD | Pending | TBD |
| Compliance Stakeholder | TBD | Pending | TBD |

