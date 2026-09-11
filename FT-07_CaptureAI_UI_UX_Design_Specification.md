# FT-07 — CaptureAI UI/UX Design Specification

**Regulatory Compliance Intelligence Platform**  
**UI/UX Redesign & Design System — White / Green Gradient Direction**

> **Design intent:** Transform the existing product UI into a calm, premium, compliance-first SaaS experience with one clear navigation system, generous white space, restrained cards, and green-gradient brand accents.

---

## 1. Document Purpose

This document is the implementation-oriented UI/UX design specification for the FT-07 Web Application. It defines how the existing project interface should be redesigned to visually and structurally follow the attached CaptureAI reference image while preserving the workflow and product scope defined by the Master PRD.

### 1.1 Source of truth

The Master PRD defines FT-07 as a continuous regulatory monitoring and AI-assisted compliance information platform monitoring RBI and SEBI, with outputs flowing through a single Supabase Backend to the Web Application. fileciteturn0file0L18-L31

The redesign must preserve the PRD's core rule: preserve the workflow and implement the interface around it. fileciteturn0file0L2348-L2362

### 1.2 Redesign objective

- Replace a dense or technical interface with a simple business dashboard.
- Use a white-first canvas with green/teal gradient brand accents and deep navy typography.
- Use one persistent left navigation rather than multiple competing tab systems.
- Make notifications and regulatory updates the primary home-screen content.
- Make compliance context visible without turning the dashboard into a data-heavy analytics console.
- Keep AI assistance accessible but secondary to regulatory information.
- Make every screen feel consistent, spacious, and enterprise-ready.

---

# 2. Design Direction

## 2.1 Visual personality

| Principle | Direction |
|---|---|
| Overall style | Premium B2B SaaS / fintech / compliance intelligence |
| Canvas | Pure or near-white background; no dark application shell |
| Brand | CaptureAI green-to-teal gradient used selectively |
| Typography | Deep navy for primary text; muted slate for supporting text |
| Surfaces | White cards with subtle borders and very soft shadows |
| Corners | Moderately rounded; avoid excessive pill-shaped UI |
| Density | Airy; prioritize scanability over information volume |
| Navigation | Single left sidebar; no clumsy multi-row tabs |
| Interaction | Clear click targets, restrained motion, obvious hierarchy |
| Tone | Trustworthy, intelligent, calm, precise |

## 2.2 Color tokens

| Token | Suggested value | Usage |
|---|---|---|
| Brand Navy | `#0A1F3E` | Headings, primary text, navigation icons |
| Brand Green | `#0BAA71` | Primary actions, active states, positive indicators |
| Brand Teal | `#00BEB4` | Gradient endpoint, highlights, AI accents |
| Green Tint | `#EFFAF5` | Selected navigation, success surfaces, soft backgrounds |
| Page White | `#FFFFFF` | Primary application canvas and cards |
| Slate | `#5B697D` | Secondary text and metadata |
| Border | `#DEE6EB` | Card and input boundaries |
| Warning | `#F4C83B` | Under-review / attention states |
| Danger | `#F04444` | Action-required / critical states |

## 2.3 Typography hierarchy

| Level | Recommended | Purpose |
|---|---|---|
| Page title | 28–32 px / semibold | Dashboard or page identity |
| Section heading | 18–20 px / semibold | Major card/section title |
| Card title | 14–16 px / semibold | Notification/document titles |
| Body | 14 px / regular | Descriptions and explanations |
| Metadata | 12–13 px / regular | Source, date, time, status |
| Micro label | 11–12 px / medium | Filters, badges, supporting labels |

---

# 3. Information Architecture

The application should use a single persistent navigation model. Avoid nested tab bars unless a screen genuinely requires a local view switch.

| Primary navigation | Purpose | Priority |
|---|---|---|
| Home | Overview, latest notifications, monitoring status, compliance summary | Primary |
| Notifications | All regulatory notifications and notification detail | Primary |
| Regulatory Sources | RBI and SEBI source status and monitored-source context | Primary |
| Compliance Insights | NLP-generated compliance information and summaries | Primary |
| Documents | Processed regulatory documents and original-document access | Primary |
| Ask AI | Contextual regulatory Q&A experience | Primary |

## 3.1 Sidebar structure

1. Top: CaptureAI logo and tagline.
2. Middle: six primary navigation items with simple line icons.
3. Selected state: very light green background, green icon, dark text.
4. Bottom: Continuous Monitoring status card.
5. Footer: copyright / product text only; no secondary navigation clutter.

## 3.2 Header structure

- Centered/right-aligned global search field: **“Search notifications, documents…”**
- Notification bell with unread indicator.
- User avatar / initials and user name.
- Minimal account chevron.
- Do not add multiple action buttons to the header.

---

# 4. Home Dashboard — Primary Screen

The attached reference should become the visual benchmark for the home screen. The dashboard is an executive scan surface, not a workflow diagram.

## 4.1 Layout

| Region | Content | Behavior |
|---|---|---|
| Left sidebar | Logo + primary navigation + monitoring status | Fixed on desktop |
| Top header | Search + notifications + user profile | Sticky or fixed |
| Hero row | Greeting + regulatory freshness statement + date | Compact |
| Metric row | New Notifications / RBI Updates / SEBI Updates | Clickable summary cards |
| Main content | Latest Notifications list | Primary scroll area |
| Right rail | Compliance Summary + Ask CaptureAI + brand statement | Secondary rail |
| Footer | Copyright / short brand phrase | Low visual weight |

## 4.2 Hero copy pattern

Example:

**Good Morning!**  
Stay ahead with the latest regulatory updates from RBI and SEBI.

Do not introduce a large hero illustration. The regulatory data itself is the visual content.

## 4.3 Metric cards

| Card | Primary value | Supporting text | Click |
|---|---:|---|---|
| New Notifications | 12 | Last 24 hours | Notifications |
| RBI Updates | 8 | Last 24 hours | RBI-filtered notifications |
| SEBI Updates | 4 | Last 24 hours | SEBI-filtered notifications |

> The numbers above are visual examples from the reference image only; production values must be populated from application data.

---

# 5. Notification UX

Notification is the key bridge between the backend intelligence pipeline and the user's daily workflow.

## 5.1 Notification card

- Show source label first: RBI or SEBI.
- Show the **1-line NLP output** as the notification title.
- Show the **Summary NLP output** as the description.
- Show relative timestamp such as “2 hours ago”.
- Use a source-specific icon treatment while keeping the overall visual system consistent.
- Provide one clear chevron/click affordance.
- Avoid excessive tags, chips, and nested metadata.

This directly follows the PRD: the 1-line NLP output is the notification title and the Summary NLP output is the notification description. fileciteturn0file0L962-L1038

## 5.2 Notification detail / View

| Section | Content |
|---|---|
| Header | Source, notification title, date/time |
| Executive brief | Short representation of detailed NLP data |
| Regulatory summary | Summary NLP output |
| Detailed intelligence | Relevant detailed NLP information |
| Source context | RBI/SEBI and original regulatory document reference |
| AI action | Voice Button / contextual AI entry point |

The user click should open the relevant regulatory information and provide a brief of the detailed NLP data, as required by the PRD. fileciteturn0file0L1004-L1038

---

# 6. Compliance Summary UX

The right rail should communicate compliance intelligence at a glance without becoming a complex analytics dashboard.

- Use a single donut/ring visualization for the high-level compliance state only if the application has an actual supported metric.
- Use three concise states: Compliant, Under Review, Action Required when those states are available from the implemented product data.
- Place the short interpretation directly below the metric.
- Use a soft green success panel for “no immediate action” only when the underlying data supports it.
- Do not invent risk scores or compliance classifications that are not part of the approved product scope.

> **Scope safeguard:** The PRD explicitly lists automated risk scoring, risk hierarchy, compliance status classification, remediation management, audit management, and several other capabilities as out of scope. The UI must not imply that these capabilities exist merely because a visual card is present. fileciteturn0file0L2199-L2226

---

# 7. Ask AI / Contextual AI UX

AI should feel integrated into the regulatory workflow rather than presented as a generic chatbot.

## 7.1 Home rail

- Heading: **“Ask CaptureAI”**
- Supporting line: **“Get instant answers from your regulatory documents”**
- Single input box with one obvious submit control.
- Optional quick actions such as Summarise, Explain, Compare only when implemented and supported.
- Keep the card compact so notifications remain the dominant content.

## 7.2 Regulatory-detail AI

- The Voice Button appears after the user has opened a regulatory item.
- The interaction must inherit the currently viewed regulatory context.
- Voice interaction flows to 11Labs and then the contextual LLM.
- Display the active context visibly so the user knows what the AI is answering against.

The PRD requires the Voice Button → 11Labs → LLM flow and requires the LLM to answer with respect to the relevant regulatory context. fileciteturn0file0L1062-L1139

---

# 8. Regulatory Sources Screen

Purpose: provide a calm source-monitoring view for RBI and SEBI without exposing backend implementation details.

| Element | UI treatment |
|---|---|
| RBI source | Large clean source card; active monitoring state; latest update |
| SEBI source | Large clean source card; active monitoring state; latest update |
| Monitoring status | Single status indicator such as Active / Monitoring |
| Recent source activity | Compact list of detected source items |
| Technical details | Hidden from default view; available only where necessary |

The PRD defines only RBI and SEBI as supported regulatory sources and explicitly removes FIU. fileciteturn0file0L37-L64

---

# 9. Documents Screen

Use a clean document list rather than a dense file-management console.

| Column / field | Purpose |
|---|---|
| Document | Name / regulatory title |
| Source | RBI or SEBI |
| Date | Regulatory document date |
| Processing state | Processed / available, where supported |
| Open | Open document or related intelligence |

- Provide search at the page level only when useful; do not duplicate global search unnecessarily.
- Use a simple list/table hybrid with generous row height.
- Keep technical artifacts such as hashes and encryption details out of the default user view unless the product later explicitly requires them.
- Original regulatory documents remain separate artifacts from OCR-processed data.

The PRD distinguishes the original regulatory document from OCR data and requires original-document preservation. fileciteturn0file0L599-L624

---

# 10. Compliance Insights Screen

This screen is the deeper information surface for NLP-generated outputs. It should prioritize reading and comparison rather than dashboard decoration.

| Area | UI pattern |
|---|---|
| Insight header | Regulatory source + title + date |
| 1-line output | Compact headline block |
| Summary | Readable summary card |
| Detailed | Long-form detail with clear headings |
| Policy context | Show relevant company compliance-policy context when available |
| AI | Contextual voice / question action |

The NLP stage receives cleaned OCR data plus trained company compliance policies and produces 1-line, detailed, and summary outputs. fileciteturn0file0L700-L722

---

# 11. Notifications Center

- Default sort: newest first.
- Filter by source: All / RBI / SEBI.
- Use unread state sparingly: small dot or subtle background, not bright banners.
- Keep notification cards visually consistent with Home.
- Opening a notification should preserve the same detailed-view pattern as Home.
- Avoid a separate tabbed navigation system for every notification category.

---

# 12. Interaction & Component Specification

| Component | Default | Hover | Active/Selected | Disabled |
|---|---|---|---|---|
| Sidebar item | Navy icon/text | Light green tint | Green icon + light green surface | Muted |
| Primary button | Green gradient | Slight elevation | Pressed / darker green | Low contrast |
| Secondary button | White + border | Green border/text | Light green surface | Muted border |
| Card | White + subtle border | Soft elevation | Optional green edge only when needed | N/A |
| Input | White + border | Green focus hint | Green focus ring | Muted surface |
| Notification row | White | Light surface tint | Green-accented / unread | Muted |
| Status dot | Context color | N/A | Context color | Grey |

## 12.1 Buttons

- One primary action per card where possible.
- Use sentence-case labels: “View details”, “Ask AI”, “Open document”.
- Avoid icon-only buttons unless the icon is universally understood.
- Voice Button may use a circular icon control but must have a tooltip/accessible label.

## 12.2 Icons

- Use one consistent outline icon family.
- Use green for active/positive states and navy for neutral navigation.
- Do not mix multiple icon styles or decorative illustrations.

---

# 13. Responsive Design

| Breakpoint | Behavior |
|---|---|
| Desktop ≥ 1280px | Persistent sidebar + 3 metric cards + main list + right rail |
| Tablet 768–1279px | Narrower sidebar or collapsible sidebar; right rail stacks below main content |
| Mobile < 768px | Web application becomes single-column; sidebar becomes compact drawer/bottom navigation as implementation permits |
| WebView | Preserve the same information hierarchy inside the mobile app shell |

The PRD specifies a mobile path of Mobile App → App Shell Architecture → WebView Container → WebView, so the UI should remain a responsive web experience rather than inventing a separate native compliance-processing workflow. fileciteturn0file0L1147-L1223

---

# 14. Accessibility & Usability Rules

- Maintain readable contrast between navy text and white backgrounds.
- Do not communicate status using color alone; pair color with text/icon.
- Minimum practical click/tap target: approximately 40–44 px for primary interactive controls.
- Keyboard focus must be visible on navigation, search, buttons, notification rows, and inputs.
- All icon-only controls require accessible labels.
- Long regulatory titles should wrap rather than truncate critical meaning.
- Loading and empty states should explain what is happening in plain language.

---

# 15. Loading, Empty, Error & State Design

| State | Design |
|---|---|
| Loading | Skeleton rows/cards with restrained motion; preserve layout |
| No notifications | Friendly empty state: “No new regulatory notifications” |
| No search results | Explain that no matching notification/document was found |
| Source unavailable | Show source status without exposing backend stack traces |
| AI loading | Compact conversational loading state with context label |
| AI failure | Plain-language retry message |
| Document processing | Show a neutral processing state only if the user can see processing status |

The PRD explicitly defines the File Found? decision and continuous monitoring behavior, while detailed technical failure states are left to architecture/implementation. Therefore these UI states should remain implementation-safe and should not imply product capabilities outside the approved workflow. fileciteturn0file0L1872-L1913

---

# 16. Content & Microcopy Rules

- Prefer short, factual labels.
- Use “RBI” and “SEBI” consistently; do not introduce alternate source naming.
- Use “Notifications”, “Regulatory Sources”, “Compliance Insights”, “Documents”, and “Ask AI” consistently across navigation.
- Avoid technical backend terminology such as OCR pipeline, SHA256, encryption, Supabase, Watchdog Extraction, or scraping on the normal user dashboard unless there is a deliberate technical/admin surface.
- Use the NLP-generated 1-line output as the notification title and Summary output as the description.
- Never fabricate regulatory conclusions in placeholder UI data.

---

# 17. Screen Inventory & Implementation Priority

| Priority | Screen | Purpose | MVP |
|---|---|---|---|
| P0 | Login / entry | Secure access into Web Application | Yes |
| P0 | Home Dashboard | Primary overview and latest updates | Yes |
| P0 | Notifications | All notifications | Yes |
| P0 | Notification Detail | Detailed brief + contextual AI | Yes |
| P0 | Regulatory Sources | RBI / SEBI monitoring context | Yes |
| P0 | Documents | Regulatory document access | Yes |
| P0 | Ask AI | Contextual question interaction | Yes |
| P1 | Compliance Insights | Deeper NLP information surface | Yes if required by current UI flow |
| P1 | Profile / settings | Account controls | Keep minimal |

## 17.1 Recommended implementation order

1. First: application shell, typography, color tokens, sidebar, header.
2. Second: Home Dashboard and notification card system.
3. Third: Notification Detail and contextual AI entry.
4. Fourth: Notifications, Regulatory Sources, Documents.
5. Fifth: Compliance Insights and responsive refinements.
6. Finally: state handling, accessibility, micro-interactions, visual QA.

---

# 18. Existing UI → Target UI Transformation

| Existing tendency to remove | Target behavior |
|---|---|
| Clumsy / competing tabs | One persistent sidebar + contextual page controls |
| Dense information blocks | Airy cards and clear grouping |
| Heavy visual decoration | Minimal green accents |
| Too many buttons | One primary action per context |
| Technical workflow exposed to users | Business-friendly regulatory language |
| Inconsistent spacing | Fixed spacing scale |
| Multiple competing surfaces | White canvas + restrained card hierarchy |
| Generic chatbot emphasis | Contextual AI tied to the regulatory item |
| Unclear notification hierarchy | 1-line title + summary description |
| Overly colorful interface | Navy + white + green/teal system |

---

# 19. Design System Rules for Developers

- Build the visual system from reusable tokens rather than page-specific CSS values.
- Create reusable components:
  - `AppShell`
  - `Sidebar`
  - `Header`
  - `MetricCard`
  - `NotificationCard`
  - `SourceBadge`
  - `StatusIndicator`
  - `InsightCard`
  - `AIInput`
  - `VoiceButton`
  - `EmptyState`
  - `Skeleton`
- Keep card padding consistent across the product.
- Use one spacing scale; avoid arbitrary margins.
- Use consistent border radius and shadow tokens.
- Do not create separate visual styles for every page.
- The logo should be used on white with sufficient clear space; do not place it inside a heavy colored box.
- Gradient should be an accent, not the entire interface background.

---

# 20. UX Acceptance Criteria

- A user can understand the latest RBI/SEBI updates within a few seconds of entering Home.
- The active navigation item is immediately recognizable.
- The interface has no unnecessary multi-level or duplicated tab navigation.
- A notification title is visibly derived from the 1-line NLP output.
- A notification description is visibly derived from the Summary NLP output.
- Clicking a notification opens the relevant regulatory information and detailed brief.
- The contextual AI action is available from the regulatory detail experience.
- RBI and SEBI are the only regulatory source identities represented in the product.
- The interface does not imply unsupported risk scoring, remediation, audit management, or other out-of-scope capabilities.
- The same visual system works on desktop, tablet, and mobile/WebView.
- The product feels white, clean, green-accented, spacious, and enterprise-ready.

---

# 21. Final Design Definition

The redesigned FT-07 interface should feel like a premium regulatory intelligence workspace rather than a technical monitoring console. The attached CaptureAI reference establishes the visual benchmark:

- White background
- Deep navy typography
- Green/teal gradient branding
- Soft rounded cards
- Restrained left sidebar
- Clean global search
- Concise metric cards
- Dominant latest-notifications feed
- Compact compliance summary
- Contextual AI entry point

The interface must preserve the approved product workflow:

**RBI/SEBI monitoring → file detection → document processing → OCR/document cleaning → NLP comparison with company compliance policies → 1-line/detailed/summary outputs → single Supabase Backend → Web Application → notification → detailed view → Voice Button → 11Labs → contextual LLM.**

The UI should expose the user-relevant outcomes of that workflow without unnecessarily exposing internal processing mechanics.

> **Core UI rule:** Simple navigation. White space. One clear hierarchy. Green gradient used with restraint. Notifications first. Contextual AI second. No clumsy tabs.

---

# Appendix A — Reference Image

The attached reference image is the visual direction for the redesign. Production data, labels, counts, and compliance outcomes must come from the implemented product rather than from the mockup.

# Appendix B — PRD Traceability

| UI/UX area | PRD basis |
|---|---|
| Regulatory sources | FR-01 / RBI + SEBI |
| Monitoring status | FR-02 / Source Monitoring Platform |
| Notifications | FR-19 / FR-20 |
| 1-line / Summary / Detailed | FR-13 / FR-14 / FR-15 |
| Notification click + detailed brief | FR-20 |
| Voice Button | FR-21 |
| 11Labs | FR-22 |
| Contextual LLM | FR-23 |
| Mobile WebView | Sections 8–14 |
| Single backend boundary | FR-17 |
