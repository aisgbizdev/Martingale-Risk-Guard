# RiskCheck XUL10 Design Guidelines

## Design Approach
**Selected System:** Material Design 3 principles with financial application refinement
**Justification:** This is a utility-focused, information-dense risk assessment tool requiring trust, clarity, and precision. Material Design provides robust patterns for forms, data display, and status communication while maintaining professional credibility essential for financial education tools.

## Typography System
- **Primary Font:** Inter (via Google Fonts CDN)
- **Secondary Font:** JetBrains Mono (for numerical data display)

**Hierarchy:**
- Page titles: text-4xl font-bold (Inter)
- Section headers: text-2xl font-semibold
- Form labels: text-sm font-medium uppercase tracking-wide
- Body text: text-base font-normal
- Data/numbers: text-lg font-mono (JetBrains Mono)
- Fine print/disclaimers: text-xs font-normal

## Layout System
**Spacing Primitives:** Tailwind units of 4, 6, 8, 12, 16
- Component padding: p-6 or p-8
- Section spacing: mb-8 or mb-12
- Form field gaps: space-y-6
- Inline elements: gap-4

**Container Structure:**
- Max width: max-w-4xl mx-auto
- Page padding: px-4 md:px-8
- Vertical rhythm: py-12 md:py-16

## Component Library

### Input Page Components
**Form Container:**
- Single-column layout with max-w-2xl
- Card elevation with subtle border and shadow
- Grouped sections with dividers

**Form Fields:**
- Labels above inputs with required indicators
- Select dropdowns with chevron icons (Heroicons)
- Number inputs with clear step indicators
- Consistent field height (h-12)
- Focus states with ring-2 utility

**Risk Check Button:**
- Full-width primary action (w-full)
- Large size (h-14 text-lg)
- Icon prefix (ChevronRight from Heroicons)
- Prominent placement with mt-8

### Results Page Components
**Status Badge:**
- Large, prominent display at top
- Icon indicators:
  - AMAN: CheckCircle (green semantic)
  - BERISIKO: ExclamationTriangle (yellow/orange semantic)
  - TIDAK LAYAK: XCircle (red semantic)
- Typography: text-3xl font-bold

**Risk Score Display:**
- Circular progress indicator or horizontal bar
- Large numerical display (text-5xl font-mono)
- "/100" suffix in muted text

**Information Cards:**
- Distinct sections for: Reasoning, Warnings, Psychology Notes, Disclaimer
- Icons from Heroicons (InformationCircle, ShieldExclamation, Brain, DocumentText)
- Bullet lists with custom markers
- Card borders with left accent line for visual hierarchy

**Warning Callouts:**
- Amber/orange background tint
- Bold icon prefix
- Contained within bordered containers

## Navigation
- Simple header with app name and logo placeholder
- "Cek Ulang" (Check Again) button on results page linking back to form
- Breadcrumb if needed: Home > Results

## Data Visualization
**Risk Score Meter:**
- Visual gauge showing 0-39 (AMAN), 40-69 (BERISIKO), 70-100 (TIDAK LAYAK)
- Color-coded segments with clear boundaries
- Current score indicator with pointer/marker

## Interactions & States
**Minimal Animation:** Subtle transitions only
- Form field focus: smooth ring appearance (transition-all duration-200)
- Button hover: slight scale (hover:scale-[1.02])
- Card entrance: No animation, instant display
- Status reveal: No dramatic transitions

**Form Validation:**
- Real-time error messages below fields
- Red text with ExclamationCircle icon
- Clear success states with green checkmarks

## Accessibility
- All form inputs with proper labels and aria-attributes
- Color not sole indicator of status (always paired with icons and text)
- Keyboard navigation fully supported
- Focus indicators clearly visible
- Semantic HTML throughout

## Icon System
**Library:** Heroicons (outline and solid variants via CDN)
**Common Icons:**
- CheckCircle, XCircle, ExclamationTriangle (status)
- ChevronDown (dropdowns)
- InformationCircle (info sections)
- ShieldExclamation (warnings)
- Brain (psychology notes)
- ChartBar (risk score)

## Page-Specific Layouts

### Input Page (/)
- Centered card layout
- Introduction text explaining tool purpose (2-3 sentences)
- Form sections grouped logically:
  1. Modal & Target (financial parameters)
  2. Strategy & Limits (trading parameters)
  3. Profile & Market (contextual factors)
- Sticky bottom action bar on mobile

### Results Page (/result)
- Hero-style status display at top
- Grid of information cards (single column on mobile, 2-column on desktop for some sections)
- Prominent disclaimer footer
- "Calculate Again" CTA at bottom

## Design Principles
1. **Trust First:** Professional, clean aesthetics that inspire confidence
2. **Clarity Over Cleverness:** Direct communication, no ambiguity
3. **Data Hierarchy:** Most critical information (risk status) most prominent
4. **Educational Tone:** Supportive, informative, never alarmist
5. **Restrained Palette:** Semantic colors only for status communication

This design creates a credible, professional risk assessment experience that users will trust for financial decision support.