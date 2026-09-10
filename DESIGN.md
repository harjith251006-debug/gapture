# Gapture AI — UI/UX Design System & Application Design Specification

**Product:** Gapture AI  
**Project:** FT-07 — Regulatory Compliance Intelligence Platform  
**Tagline:** **“Gaps, Captured.”**  
**Platforms:** Desktop Web, Tablet, Mobile Web, Mobile WebView  
**Frontend:** Next.js + TypeScript  
**Design Direction:** Modern Enterprise SaaS / RegTech / AI-assisted compliance intelligence

---

## 1. Purpose

This document is the UI/UX source of truth for the Gapture AI FT-07 application.

The design must provide one consistent experience across desktop, tablet, mobile web, and the mobile WebView shell.

The supplied visual reference establishes the primary direction:

- Clean enterprise SaaS
- Light/white surfaces
- Deep navy typography
- Teal/green brand accents
- Blue interactive elements
- Subtle gradients
- Rounded cards
- Restrained shadows
- Clear information hierarchy
- AI-assisted visual cues
- Professional RegTech/compliance appearance

The interface must communicate:

> **Trust + Regulatory Intelligence + AI + Clarity**

It must feel like a professional compliance platform, not a generic consumer dashboard or chatbot.

---

# 2. Design Principles

## 2.1 Trust First

Prioritize:

- Regulatory source visibility
- Document identity
- Regulatory authority
- Effective dates
- Processing status
- AI confidence where available
- Clear distinction between source content and AI interpretation
- Predictable navigation

AI-generated interpretation must never visually appear to be the official regulatory source.

## 2.2 Intelligence Without Complexity

Use:

- Plain-language summaries
- Progressive disclosure
- Compact metrics
- Clear labels
- Expandable details
- Contextual actions

Avoid unnecessary AI jargon, excessive charts, and decorative AI effects.

## 2.3 Source → Insight → Action

Every major screen should make clear:

1. What happened?
2. Which regulatory source caused it?
3. What does it mean?
4. What should the user inspect next?

## 2.4 Responsive by Design

Mobile is not a compressed desktop layout.

Tables become cards or intentional horizontal-scroll regions, sidebars become drawers/bottom navigation, dashboards stack vertically, and secondary actions move into menus.

---

# 3. Brand Identity

## 3.1 Brand

Primary display name:

**Gapture AI**

Product name:

**Gapture**

## 3.2 Tagline

Primary tagline:

> **Gaps, Captured.**

Supporting statement:

> **Turn regulatory complexity into actionable insights.**

Use the tagline strategically on:

- Login
- Empty states
- Mobile splash/entry
- Brand/about areas
- Footer

Do not repeat it inside every dashboard card.

## 3.3 Logo

Use the supplied Gapture AI logo as the canonical brand asset.

Required variants:

1. Full desktop logo
2. Compact tablet logo
3. Symbol-only mobile mark
4. Light/monochrome version for dark surfaces
5. Dark version for light surfaces

Never stretch, rotate, recolor, or distort the logo.

---

# 4. Visual Language

The application should feel:

- Modern
- Premium
- Enterprise
- Clean
- Intelligent
- Calm
- Secure
- Data-oriented

Use white/light backgrounds, navy headings, teal/green brand highlights, blue actions, light borders, subtle shadows, and rounded cards.

---

# 5. Color System

These are the target design tokens derived from the supplied visual reference. Adjust only where required for accessibility/contrast.

## 5.1 Brand

| Token | Hex | Usage |
|---|---|---|
| `brand.primary` | `#0B6BFF` | Primary actions/links |
| `brand.secondary` | `#00C49A` | Brand teal/green |
| `brand.accent` | `#14B8A6` | AI accents/highlights |
| `brand.deep` | `#0B1F4D` | Main navy/headings |
| `brand.gradient` | Navy → Teal → Green | Logo/brand accents |

## 5.2 Semantic

| Token | Hex | Usage |
|---|---|---|
| `status.success` | `#10B981` | Matched/success/active |
| `status.warning` | `#F59E0B` | Partial/warning |
| `status.danger` | `#EF4444` | Critical/missing/error |
| `status.info` | `#3B82F6` | Information |
| `status.neutral` | `#64748B` | Neutral/low |

Never communicate status through color alone. Combine color with label/icon.

## 5.3 Neutrals

| Token | Hex |
|---|---|
| `neutral.0` | `#FFFFFF` |
| `neutral.50` | `#F8FAFC` |
| `neutral.100` | `#F1F5F9` |
| `neutral.200` | `#E2E8F0` |
| `neutral.300` | `#CBD5E1` |
| `neutral.500` | `#64748B` |
| `neutral.700` | `#334155` |
| `neutral.900` | `#0F172A` |

---

# 6. Typography

Primary font:

**Inter**

Fallback:

`Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

| Role | Size | Weight |
|---|---:|---:|
| Display | 36–44px | 700 |
| Page Title | 28–32px | 700 |
| Section Heading | 20–24px | 700 |
| Card Heading | 16–18px | 600 |
| Body | 14–16px | 400 |
| Supporting | 12–14px | 400 |
| Caption | 11–12px | 500 |
| Metric | 28–36px | 700 |

Mobile page titles should normally be 22–26px.

---

# 7. Spacing, Radius & Elevation

Use a 4px spacing base:

`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64px`

Recommended radius:

- Inputs/buttons: 8px
- Small cards: 10px
- Standard cards: 12px
- Modals/panels: 16px
- Mobile sheets: 20px
- Pills/badges: 999px

Use restrained shadows. Prefer borders and surface contrast over heavy elevation.

---

# 8. Responsive Layout

## Desktop

```text
┌───────────────────────────────────────────────────────┐
│ Global Header                                         │
├──────────────┬────────────────────────────────────────┤
│ Sidebar      │ Main Content                           │
│              │                                        │
│ Navigation   │                                        │
└──────────────┴────────────────────────────────────────┘
```

Recommended:

- Sidebar: 216–240px
- Header: 56–64px
- Main content: fluid
- Large desktop content: approximately 1440–1600px maximum where useful

## Tablet

- Collapsible sidebar
- Reduced horizontal spacing
- Two-column cards where practical
- Responsive tables

## Mobile

```text
┌─────────────────────────┐
│ Header                  │
├─────────────────────────┤
│ Main Content            │
│                         │
│ Cards / Lists           │
├─────────────────────────┤
│ Bottom Navigation       │
└─────────────────────────┘
```

Use approximately 16px page padding and 12–16px card padding.

Breakpoints:

- Mobile: `<640px`
- Tablet: `640–1023px`
- Desktop: `1024–1439px`
- Large desktop: `1440px+`

---

# 9. Global Application Shell

The shell consists of:

```text
Gapture Logo
      ↓
Global Header
      ↓
Sidebar / Mobile Navigation
      ↓
Main Content
      ↓
Contextual Actions
```

## Desktop Header

Include:

- Gapture AI logo
- Breadcrumb when useful
- Global search
- Notification bell
- Avatar
- User name
- Role
- Account menu

Search placeholder:

> Search regulations, controls, or gaps...

## Sidebar

Primary navigation:

1. Dashboard
2. Regulatory Intelligence
3. Compliance Analysis
4. My Documents
5. Reports
6. Organization
7. Settings

Active state should use subtle teal/blue surface treatment.

## Mobile Navigation

Recommended high-frequency destinations:

- Dashboard
- Regulatory
- Analysis
- Reports
- More

“More” contains secondary navigation such as Documents, Organization, Settings, and Profile.

---

# 10. Authentication

## Login

Two-panel desktop composition:

```text
┌────────────────────────────────────────────────────┐
│ Gapture AI             │ Welcome Back              │
│ Gaps, Captured.        │                           │
│                        │ Email                     │
│ Turn regulatory        │ [________________]        │
│ complexity into        │                           │
│ actionable insights.   │ Password                  │
│                        │ [________________]        │
│                        │                           │
│                        │ [ Sign In ]               │
│                        │ [ Sign in with SSO ]      │
└────────────────────────────────────────────────────┘
```

Brand panel may contain:

- Logo
- Tagline
- Three concise benefits
- Soft brand gradient

Authentication states:

- Loading
- Invalid credentials
- Password reset
- Session expired
- Account unavailable
- Network failure

---

# 11. Dashboard

The dashboard is the primary overview.

Header:

> **Welcome back, [Name] 👋**

Supporting text:

> Here's your compliance overview for today.

Actions may include:

- Generate Report
- Search

## KPI cards

Recommended information:

- Regulatory Updates
- Controls Matched
- Critical Gaps
- Overall Compliance Coverage

Example:

```text
24 Regulatory Updates
15 Controls Matched
3 Critical Gaps
78% Overall Compliance
```

Only show metrics backed by real data.

## Recent Regulatory Updates

Display:

- Source
- Title
- Date
- Status
- New/read state
- View action

## Compliance Trend

Use a line/trend visualization only when sufficient historical data exists.

## AI Insights

Compact card labelled:

> ✦ Generated by Gapture AI

Keep AI insights concise.

---

# 12. Regulatory Intelligence

Purpose:

> Track and view the latest regulatory information from RBI and SEBI.

Page:

```text
Regulatory Intelligence

[Search regulations...] [Filters]

[All] [RBI] [SEBI]

────────────────────────────────────
Regulatory List
────────────────────────────────────
```

Desktop columns:

- #
- Title
- Source
- Date
- Status
- Action

Mobile converts rows to cards:

```text
┌─────────────────────────────┐
│ SEBI                        │
│ Cybersecurity Framework     │
│ 01 Oct 2026                 │
│ [NEW]               [View]  │
└─────────────────────────────┘
```

Filters should only represent actual backend capabilities.

---

# 13. Regulatory Document Detail

Structure:

```text
[Back]

SEBI Circular — Cybersecurity & Cyber Resilience Framework

Source: SEBI
Version: 2026
Effective: 01 Oct 2026
Status: New

[View Source Document]

──────────────────────────
AI Summary
──────────────────────────

...

──────────────────────────
Detailed Information
──────────────────────────

...

[Ask a Question] [Voice]
```

Always distinguish original regulatory content from AI-generated interpretation.

---

# 14. Compliance Analysis

The primary design reference is the supplied Regulatory Comparative Analysis screen.

Core concept:

```text
Regulatory Source
        ↓
Dual-Stream Comparison Engine
        ↓
Organization Controls
        ↓
Compliance Assessment
```

## Page Header

Title:

> **Regulatory Comparative Analysis**

Subtitle:

> Compare regulatory requirements against organizational controls.

Show analysis status/confidence/timestamp only when those values exist in the system.

## Dual-Stream Engine

```text
REGULATORY STREAM             CONTROL STREAM

Regulatory Source             Organization Controls
       │                              │
       └────────────┐    ┌────────────┘
                    ↓    ↓
              Requirement Extraction
                       ↓
                  Control Mapping
                       ↓
                  Semantic Matching
                       ↓
                Compliance Assessment
```

Visual direction:

- Light blue/lavender central AI panel
- Blue regulatory connector
- Teal control connector
- Brain/AI icon
- Minimal animation

---

# 15. Compliance Overview

Use:

```text
Overall Compliance Coverage
78%

Critical | High | Medium | Low
```

Semantic colors:

- Critical: red
- High: orange
- Medium: amber
- Low: neutral/blue

Use text and icons with color.

---

# 16. Compliance Gaps

Tabs:

- Compliance Gaps
- Matched
- Partial
- Missing
- All Requirements

Desktop columns:

- Requirement
- Regulatory Source
- Mapped Control
- Coverage
- Severity
- Action

Actions may include:

- Review
- View
- Create Control
- More

On mobile, use cards rather than squeezing all columns into the viewport.

---

# 17. Gap Detail

Desktop uses a right-side drawer/panel.

```text
Main Analysis                  Gap Details
──────────────────────        ┌───────────────────┐
                              │ Gap Details    X  │
                              │ [CRITICAL]        │
                              │                   │
                              │ Requirement       │
                              │ ...               │
                              │ Current Control   │
                              │ ...               │
                              │ Gap Description   │
                              │ ...               │
                              │ Risk              │
                              │ ...               │
                              │ Recommended Action│
                              │ ...               │
                              │ [Assign Action]   │
                              └───────────────────┘
```

Mobile uses a full-screen sheet.

Information order:

1. Severity
2. Requirement
3. Regulatory Source
4. Current Control
5. Gap Description
6. Risk/impact if supported
7. Recommended Action
8. Confidence if supported
9. Review status
10. Primary action

---

# 18. Regulatory Change Analysis — Scope Guardrail

The supplied visual reference contains a Regulatory Change Analysis section.

However, FT-07 currently excludes regulatory change/version-to-version comparison.

Therefore:

**Do not implement or expose this as an active FT-07 MVP feature unless product scope is explicitly changed.**

It may be documented as future scope only.

---

# 19. Executive Summary

Where an approved summary exists:

```text
Executive Summary                  Generated by Gapture AI

Headline

• Key point
• Key point
• Key point

[Generate Report] [Export]
```

AI-generated information must remain visually distinct from regulatory source language.

---

# 20. My Documents

Recommended:

```text
My Documents

[Search...] [Upload if supported]

Document
Type
Updated
Status
Action
```

Use cards on mobile.

Only expose upload/version functionality actually supported by the implementation.

---

# 21. Reports

```text
Compliance Reports

[Generate Report]

Scheduled Reports
Custom Reports

Recent Reports
────────────────────────────

Report Name
Date
Format
Status
[Download]
```

Do not expose unsupported reporting features.

---

# 22. Settings

Categories may include:

- Profile
- Organization
- Users & Access
- Notifications
- Integrations
- API Access
- Security
- Appearance

Only expose settings implemented by the backend/API.

---

# 23. Notifications

FT-07 notification model:

```text
Title       = 1-Line NLP Output
Description = Summary NLP Output
```

Click behavior:

```text
Notification
     ↓
User Click
     ↓
Relevant Regulatory View
     ↓
Brief of Detailed NLP Information
```

Unread notifications use a subtle accent indicator and stronger title weight.

---

# 24. AI Content

AI-generated areas must be identifiable.

Recommended:

> ✦ Generated by Gapture AI

or:

> AI Summary

Use the Gapture AI accent treatment consistently for:

- AI Summary
- AI Insights
- Contextual AI
- Voice AI
- Generated content

---

# 25. Voice Interaction

Recommended:

```text
[ Ask a Question ] [ 🎙 Voice ]
```

States:

### Idle
Microphone icon.

### Listening
Listening indicator + stop action.

### Processing
> Understanding your question…

### Speaking
> Gapture AI is responding…

### Error
Concise retry action.

Avoid oversized animated voice interfaces.

---

# 26. Tables

Desktop:

- Compact rows
- Clear header
- Subtle borders
- Hover state
- Status badges
- Right-aligned actions

Mobile:

- Convert complex rows to cards
- Use horizontal scrolling only where tabular relationships must remain intact

Never squeeze many desktop columns into a 360px viewport.

---

# 27. Buttons

## Primary

Deep navy/brand blue.

Examples:

- Sign In
- Generate Report
- Run Analysis

## Secondary

Light surface + border.

## AI Action

Subtle teal/purple/brand-accent treatment.

## Destructive

Red only for genuinely destructive operations.

---

# 28. Status Badges

Examples:

```text
[NEW]
[READ]
[ACTIVE]
[MATCHED]
[PARTIAL]
[MISSING]
[CRITICAL]
[HIGH]
[MEDIUM]
[LOW]
```

Keep badges compact and readable.

---

# 29. Cards

Standard card:

```text
┌──────────────────────────────┐
│ Icon   Card Title             │
│                              │
│ Main content / metric        │
│ Supporting information        │
└──────────────────────────────┘
```

Use:

- 12px radius
- Light border
- White surface
- Consistent padding
- Minimal shadow

---

# 30. Empty, Loading & Error States

## Empty

```text
[Icon]

No regulatory updates yet

Gapture will surface new RBI and SEBI
regulatory information here.

[Refresh]
```

## Loading

Prefer skeletons for:

- KPI cards
- Tables
- Document details
- AI result panels

## Error

Example:

> **Unable to load regulatory updates**  
> We couldn't retrieve the latest information right now.

[Try Again]

Never expose stack traces.

---

# 31. Document Viewer

Desktop:

```text
┌───────────────────────┬────────────────────────┐
│ Original Document     │ AI Summary             │
│                       │                        │
│ Regulatory source     │ Summary                │
│                       │ Detailed               │
│                       │ 1-Line                 │
│                       │                        │
│                       │ Ask a Question         │
└───────────────────────┴────────────────────────┘
```

Mobile:

```text
Document
   ↓
AI Summary
   ↓
Detailed Information
   ↓
Ask a Question
```

The official document and AI interpretation must remain visually distinct.

---

# 32. Mobile UX

## Mobile Dashboard

Order:

1. Header
2. Greeting
3. Overall compliance
4. Critical gaps
5. Regulatory updates
6. AI insights
7. Secondary metrics

Do not place four KPI cards in one row.

## Mobile Regulatory List

Use stacked cards.

## Mobile Compliance Analysis

```text
Page Header
      ↓
Coverage
      ↓
Severity Summary
      ↓
Tabs
      ↓
Gap Cards
      ↓
Gap Detail Sheet
```

Compact the desktop dual-stream diagram to:

```text
Regulatory Requirement
        ↓
AI Comparison
        ↓
Organization Control
        ↓
Assessment
```

## Mobile Gap Detail

Use a full-screen sheet:

```text
← Gap Details                 X

[CRITICAL]

Requirement
...

Current Control
...

Gap Description
...

Recommended Action
...

[Assign Action]
```

---

# 33. Mobile WebView

FT-07 mobile follows:

```text
Mobile App
    ↓
App Shell
    ↓
WebView Container
    ↓
Responsive Next.js Application
```

Reuse the same:

- Backend
- APIs
- Authentication
- Database
- Application logic

The WebView should support:

- Authentication
- Navigation
- Document viewing
- Safe external links
- Microphone permissions for voice
- Back navigation
- Loading/error states

Do not create a separate mobile compliance-processing workflow.

---

# 34. Accessibility

Target WCAG 2.2 AA where practical.

Requirements:

- Keyboard navigation
- Visible focus states
- Sufficient contrast
- Semantic HTML
- Accessible labels
- Screen-reader-friendly controls
- Form error associations
- Status not communicated by color alone
- Approximately 44px touch targets on mobile
- Dialog focus management
- Escape-key handling for desktop dialogs/drawers
- Reduced-motion support

---

# 35. Motion

Use subtle motion:

- 150–250ms transitions
- Drawer slide/fade
- Small hover elevation
- Tab transitions
- Skeleton loading

Avoid:

- Constant pulsing
- Large AI animations
- Particle effects
- Long transitions

---

# 36. Design Tokens

Implement shared tokens rather than one-off values.

```text
colors
├── brand
├── neutral
├── semantic
└── surface

typography
├── fontFamily
├── fontSize
├── fontWeight
└── lineHeight

spacing
├── xs
├── sm
├── md
├── lg
└── xl

radius
├── sm
├── md
├── lg
└── full

shadow
├── sm
├── md
└── lg
```

---

# 37. Reusable Component Library

Recommended components:

```text
BrandLogo
AppShell
Sidebar
MobileNavigation
TopHeader
Breadcrumbs
GlobalSearch
UserMenu
NotificationBell
PageHeader
MetricCard
StatusBadge
SeverityBadge
DataTable
ResponsiveTable
DocumentCard
RegulatoryCard
ComplianceGapCard
GapDetailPanel
AIInsightCard
AISummary
AIConfidenceBadge
EmptyState
LoadingSkeleton
ErrorState
Modal
Drawer
BottomSheet
Tabs
FilterBar
SearchInput
PrimaryButton
SecondaryButton
IconButton
VoiceButton
DocumentViewer
```

Components must be reusable and composable.

---

# 38. Page Inventory

## Authentication

- Login
- Password Reset
- Authentication Error

## Core Application

- Dashboard
- Regulatory Intelligence
- Regulatory Document Detail
- Compliance Analysis
- Gap Detail
- My Documents
- Reports
- Organization
- Settings
- Notifications

## AI

- AI Summary
- Contextual Q&A
- Voice Interaction

## Mobile

- Mobile Dashboard
- Mobile Regulatory List
- Mobile Document Detail
- Mobile Compliance Analysis
- Mobile Gap Detail
- Mobile Navigation
- Mobile Settings

---

# 39. Navigation Map

```text
LOGIN
  ↓
DASHBOARD
  ├── Regulatory Intelligence
  │      └── Regulatory Document
  │             └── Contextual AI
  │
  ├── Compliance Analysis
  │      └── Gap Detail
  │
  ├── My Documents
  ├── Reports
  ├── Organization
  ├── Settings
  └── Notifications
         └── Regulatory Document
```

---

# 40. Core User Journeys

## Regulatory Journey

```text
Login
  ↓
Dashboard
  ↓
Notification / Regulatory Update
  ↓
Regulatory Document
  ↓
AI Summary
  ↓
Detailed Information
  ↓
Contextual Question
  ↓
Voice if desired
```

## Compliance Analysis Journey

```text
Dashboard
  ↓
Compliance Analysis
  ↓
Gap
  ↓
Gap Detail
  ↓
Review / Supported Action
```

The UI must not imply remediation management unless it is actually implemented.

---

# 41. Performance-Oriented UI Rules

The frontend should:

- Avoid duplicate API calls
- Minimize unnecessary requests
- Prefer appropriate server-side fetching
- Paginate large lists
- Lazy-load heavy document/AI interfaces
- Avoid loading all documents at once
- Use skeleton states
- Optimize for slower mobile networks

---

# 42. Security-Oriented UI Rules

The frontend must:

- Never expose API keys
- Never expose service-role credentials
- Respect backend authorization
- Respect RLS
- Never render unsanitized HTML
- Safely display regulatory content
- Validate upload inputs
- Never rely on hidden UI actions as authorization

Frontend visibility is not a security boundary.

---

# 43. Responsive Acceptance Criteria

Test at:

### Mobile
- 360px
- 390px
- 430px

### Tablet
- 768px
- 834px
- 1024px

### Desktop
- 1280px
- 1440px
- 1920px

Acceptance:

- No unintended horizontal overflow
- No clipped content
- No overlapping controls
- Touch targets remain usable
- Typography remains readable
- Primary actions remain accessible
- Navigation remains clear
- Cards stack correctly
- Drawers become sheets/modals where appropriate

---

# 44. Visual QA Checklist

## Brand

- Correct Gapture logo
- Correct brand colors
- Inter typography
- Appropriate tagline placement
- Consistent AI identity

## Layout

- Correct spacing
- Correct alignment
- Consistent cards
- Responsive behavior

## Interaction

- Hover
- Focus
- Loading
- Error
- Empty
- Disabled

## Accessibility

- Contrast
- Keyboard navigation
- Labels
- Focus management

## Data

- Real backend data
- No fabricated metrics
- Correct source
- Correct status
- Correct dates

---

# 45. Brand Carry-Through

The Gapture identity must remain consistent across the entire application.

### Logo

- Desktop sidebar/header
- Login
- Mobile shell

### Brand Colors

- Navigation
- Buttons
- AI indicators
- Selected states
- Important accents

### Tagline

Use strategically in:

- Login
- Empty states
- Mobile splash/entry
- Brand/about
- Footer

### AI Identity

Use the Gapture AI sparkle/accent consistently for AI-generated features.

---

# 46. Footer

Where a footer is appropriate:

> **From regulations to resolution — Gaps, Captured.**

Supporting:

```text
Gapture AI
Regulatory Compliance Intelligence
```

Keep the footer minimal.

---

# 47. FT-07 Scope Guardrails

The following are not active FT-07 UI features unless the approved product scope changes:

- FIU monitoring
- Additional regulatory sources
- Automated gap classification
- Risk scoring
- Risk hierarchy
- Remediation management
- Compliance status classification
- Evidence management
- Audit management
- Regulatory version/change comparison
- Clause-level comparison
- Knowledge graph
- Control mapping
- Department mapping
- Policy drift detection

The visual reference must not cause these capabilities to be implemented accidentally.

---

# 48. Design-to-Development Mapping

```text
DESIGN SYSTEM
      ↓
APPLICATION SHELL
      ↓
AUTHENTICATION
      ↓
DASHBOARD
      ↓
REGULATORY INTELLIGENCE
      ↓
DOCUMENT DETAIL
      ↓
COMPLIANCE ANALYSIS
      ↓
GAP DETAIL
      ↓
NOTIFICATIONS
      ↓
REPORTS
      ↓
SETTINGS
      ↓
CONTEXTUAL AI
      ↓
VOICE
      ↓
MOBILE WEBVIEW
```

---

# 49. Final Design Direction

Gapture AI should communicate:

> **A trusted enterprise compliance intelligence platform that turns regulatory information into understandable, actionable insight.**

The interface should remain:

- Professional
- Minimal
- Intelligent
- Data-driven
- Trustworthy
- Responsive
- Accessible

The core visual identity is:

**Deep Navy + Teal/Green + Blue + White**

combined with:

**Inter typography + rounded enterprise cards + subtle gradients + restrained shadows + semantic status colors + consistent Gapture AI branding.**

Core visual metaphor:

```text
REGULATIONS
      +
ORGANIZATION CONTEXT
      ↓
GAPTURE AI
      ↓
CLEAR INSIGHT
      ↓
INFORMED COMPLIANCE DECISION
```

> **Gaps, Captured.**

---

# 50. Implementation Rule

Before implementing any UI:

1. Read `CLAUDE.md`.
2. Inspect `/skills`.
3. Read the Master PRD, BRD, HLSA, database schema, API specification, and implementation plan.
4. Treat this document as the UI/UX design source of truth.
5. Reuse existing project components where appropriate.
6. Do not create duplicate design systems.
7. Use shared design tokens.
8. Build responsive components rather than desktop-only components.
9. Use real API contracts when available.
10. Do not implement features merely because they appear in a visual mockup.
11. Preserve the Gapture logo and tagline.
12. Preserve the approved visual identity.
13. Make every desktop screen intentionally responsive for mobile.
14. Ensure WebView compatibility.
15. Keep AI-generated content visually distinct from regulatory source content.
