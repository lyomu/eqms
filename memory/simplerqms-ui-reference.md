---
name: simplerqms-ui-reference
description: UI/UX patterns from SimplerQMS product-tour screenshots to borrow when building the eQMS Next.js frontend
metadata:
  type: project
---

The user shared SimplerQMS product-tour screenshots (2026-06) as the visual reference for the eQMS frontend. Borrow these patterns when the frontend milestone arrives (backend M0+ does not need them yet). Supplements the SimplerQMS_UI_UX_Analysis.md design doc.

**Layout**
- Left sidebar ~280px: logo + collapse toggle; Search, Notifications; "Workspace" group → Home, Documents, Change, Templates, Training (expand: My Training / Organization Training / Training Rules), Periodic reviews (expand: My Reviews / Organization Reviews), Analytics. Bottom: Settings, user avatar+name, Logout, tiny version string.
- Two-pane detail: metadata/details on left, live document preview (PDF viewer w/ page nav + zoom %, "View in Word", "Open PDF in new tab", download, fullscreen) on right.

**Workflow stepper**: horizontal states with ✓ for completed, dotted circles for pending, blue underline progress bars, chevron dropdown per state (e.g. Draft → Review → Review Closed → Approval).

**Part 11 signing ceremony** (matches CLAUDE.md rule 4): "Action Confirmation — This action requires a digital signature" with a controlled meaning statement (e.g. "I hereby state that I have found no errors…"), then "Authenticate to Continue" modal (email + password → Continue). See [[milestone-2-signatures]] when built.

**Signature manifestation block** (rendered on document, compact — good model for our PDF/screen rendering): box labelled "Controlled Document Approved", meaning statement, **Name** (bold), signature hash, timestamp with GMT offset, "Electronically Signed in SimplerQMS", "Timestamp".

**"Change Summary Needed" modal**: rich-text editor (Normal/B/I/U/link/ordered+unordered lists), captures reason-for-change for the major-version change log, plus an AI "Generate Summary" button + Submit. Reuse for reason_for_change capture.

**My Work / Home**: "time-sensitive actions assigned to you", filter tabs All/Upcoming/Overdue (with counts); left VIEWS list (All, Authoring, Reviewing, Approval, Periodic Review, Training, To-do, Effectiveness Check); table cols ID / Action Type (colored icon) / Title / Version; bottom action buttons (Mark as completed, Approve, Send for review, Send for approval).

**Tables**: sortable headers (↑↓), status badges — About Due=yellow, Scheduled=grey, Closed=blue, Active=green, Overdue/Closed-overdue=red, Pending=blue/grey; circular colored initials for assignees; Export / "Export as CSV".

**Create modals**: Create Document (Title, Choose template dropdown Blank/SOP/WI/Complaint, upload DOCX/PDF/XLSX). Create Change Request (Title, Process dropdown, Major/Minor type cards with descriptions, upload). Assign Action (Title, rich-text Description, Link-a-document dropdown, Due date, Assignee, Requires-signature toggle).

**Analytics**: tabs Overview / Quality Documents / Training / Change Requests / Periodic reviews / Actions; cards = big KPI number + chart (bar/donut-with-center-total/trend-line) + "Full report >"; filters Month / Last 90 days / All types; period-over-period % (green up); Export as CSV. (Build strong reporting — it's SimplerQMS's weak spot per the analysis doc.)

**Document detail**: yellow "Working Copy" badge, version selector dropdown (v1.5 ▾), "Last modified…", Details (Effective date, Due date, Quality Process, Tags, Created from Template, Document type, Approved At, Last Review Closed At), Document Access (Owners/Authors avatars), tabs Overview/Attachments/Related Items, "Check Out" button.

**Visual style**: dark navy primary (~#1F4E79), blue primary buttons, orange accent for some primary CTAs (Create), rounded status pills, professional/clean. Product-tour tooltips = dark navy rounded boxes, white text, Back arrow + Next, dot connector.
