"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Eye,
  Mail,
  MinusCircle,
  PlusCircle,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAddCapaAction,
  useApproveCapa,
  useCapa,
  useCapaActions,
  useCapaAudit,
  useCapaTransition,
  useCloseCapa,
  useUpdateCapaDetails,
  useUpdateCapaRootCause,
  type CapaAction,
  type UpdateCapaDetailsInput,
} from "@/hooks/useCapa";
import { useUsers } from "@/hooks/useDocuments";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { ReasonModal } from "@/components/common/ReasonModal";
import { SignatureModal } from "@/components/common/SignatureModal";
import { CapaStatusBadge } from "@/components/capa/CapaStatusBadge";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/format";
import { sanitizeHtml } from "@/lib/html";
import {
  CAPA_PRIORITY_LABELS,
  CAPA_SOURCE_LABELS,
  type CapaActionResponse,
  type CapaActionTypeKey,
  type CapaResponse,
} from "@/types/capa";

type SectionKey =
  | "containment"
  | "keywords"
  | "notes"
  | "documents"
  | "payment"
  | "emails"
  | "investigation"
  | "close";

type ObjectKey = "source" | "root" | "corrective" | "preventive";

const INITIAL_SECTIONS: Record<SectionKey, boolean> = {
  containment: false,
  keywords: false,
  notes: false,
  documents: false,
  payment: false,
  emails: false,
  investigation: false,
  close: false,
};

const EMAIL_TEMPLATES = [
  ["Logged", "Logged"],
  ["Assigned", "Assigned"],
  ["Rejected", "Rejected"],
  ["Investigation", "Investigation"],
  ["CAPA-Corrective Action", "Corrective Action Request"],
  ["CAPA-Preventive Action", "Preventive Action Request"],
  ["Effectiveness Check", "Effectiveness Check"],
  ["Effectiveness Check Completed", "Effectiveness Check Completed"],
  ["Final Review", "Final Review"],
  ["Closed", "Closed"],
  ["Reactivated", "Reactivated"],
];

type CapaDetailDraft = {
  title: string;
  source: CapaResponse["source"];
  description: string;
  aboutType: string;
  aboutReference: string;
  aboutDetails: string;
  containmentDetails: string;
  documentReferences: string;
  keywords: string;
  assignmentComment: string;
  rootCause: string;
  correctiveActionPlan: string;
  preventiveActionPlan: string;
};

type DraftChangeHandler = <K extends keyof CapaDetailDraft>(field: K, value: CapaDetailDraft[K]) => void;

const EMPTY_DETAIL_DRAFT: CapaDetailDraft = {
  title: "",
  source: "OTHER",
  description: "",
  aboutType: "",
  aboutReference: "",
  aboutDetails: "",
  containmentDetails: "",
  documentReferences: "",
  keywords: "",
  assignmentComment: "",
  rootCause: "",
  correctiveActionPlan: "",
  preventiveActionPlan: "",
};

export default function CapaDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const capa = useCapa(id);
  const actions = useCapaActions(id);
  const audit = useCapaAudit(id);
  const transition = useCapaTransition();
  const approve = useApproveCapa();
  const close = useCloseCapa();
  const updateDetails = useUpdateCapaDetails();
  const users = useUsers();

  const [sections, setSections] = useState<Record<SectionKey, boolean>>(INITIAL_SECTIONS);
  const [draft, setDraft] = useState<CapaDetailDraft>(EMPTY_DETAIL_DRAFT);
  const [activeObject, setActiveObject] = useState<ObjectKey | null>(null);
  const [closeDraft, setCloseDraft] = useState({ email: "", comment: "", documents: "" });
  const [approveOpen, setApproveOpen] = useState(false);
  const [reasonAction, setReasonAction] = useState<null | { action: CapaAction; title: string; defaultReason: string }>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeWarningOpen, setCloseWarningOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [effResult, setEffResult] = useState("");
  const [printing, setPrinting] = useState(false);

  const ownerName = useMemo(() => {
    const by = capa.data?.assignedTo ?? capa.data?.createdBy;
    if (!by) return "-";
    return users.data?.find((user) => user.id === by)?.fullName ?? `User #${by}`;
  }, [capa.data, users.data]);

  useEffect(() => {
    if (capa.data) {
      setDraft(draftFromCapa(capa.data));
    }
  }, [capa.data?.id, capa.data?.version]);

  if (capa.isLoading) return <LoadingScreen label="Loading CAPA..." />;
  if (capa.isError || !capa.data) return <ErrorAlert title="Error" message="Failed to load this CAPA." />;

  const c = capa.data;
  const about = parseKeyValueBlock(c.aboutDetails);
  const rootCause = parseKeyValueBlock(draft.rootCause);
  const corrective = parseKeyValueBlock(draft.correctiveActionPlan);
  const preventive = parseKeyValueBlock(draft.preventiveActionPlan);
  const editableRootCause = true;
  const closeWarnings = closingWarnings(c, actions.data);

  function toggleSection(key: SectionKey) {
    setSections((current) => ({ ...current, [key]: !current[key] }));
  }

  async function runAction(act: CapaAction, reason: string) {
    try {
      await transition.mutateAsync({ id, action: act, expectedVersion: c.version, reason });
      toast.success("Done");
    } catch {
      /* interceptor surfaces errors */
    }
  }

  function requestReasonAction(act: CapaAction, title: string, defaultReason: string) {
    setReasonAction({ action: act, title, defaultReason });
  }

  function requestClose() {
    if (closeWarnings.length > 0) {
      setCloseWarningOpen(true);
      return;
    }
    openCloseFields();
  }

  function updateDraft<K extends keyof CapaDetailDraft>(field: K, value: CapaDetailDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function openCloseFields() {
    setSections((current) => ({ ...current, close: true }));
    setCloseDraft((current) => ({ ...current, email: current.email || ownerName }));
    requestAnimationFrame(() => document.getElementById("capa-close-section")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function saveDraft(reason: string, overrides: Partial<CapaDetailDraft> = {}) {
    const nextDraft = { ...draft, ...overrides };
    try {
      await updateDetails.mutateAsync(buildUpdatePayload(c, nextDraft, reason));
      setDraft(nextDraft);
      toast.success("CAPA details saved");
    } catch {
      /* interceptor surfaces errors */
    }
  }

  function printCurrentCapaReport() {
    setPrinting(true);
    const previousTitle = document.title;
    document.title = c.capaNumber;
    let cleaned = false;

    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      document.title = previousTitle;
      setPrinting(false);
      window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup);
    window.setTimeout(() => {
      window.print();
      window.setTimeout(cleanup, 1200);
    }, 100);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline">
          <Link href="/capa">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <Button asChild className="bg-warning text-slate-950 hover:bg-warning/90">
          <Link href="/capa">
            <Eye className="h-4 w-4" />
            View All Objects
          </Link>
        </Button>
        <WorkflowActions
          status={c.status}
          pending={transition.isPending}
          onSubmitInvestigation={() => runAction("submit-for-investigation", "Submitted for investigation")}
          onSubmitApproval={() => runAction("submit-for-approval", "Submitted for approval")}
          onReject={() => requestReasonAction("reject", "Reject CAPA", "Rejected")}
          onApprove={() => setApproveOpen(true)}
          onStart={() => runAction("start-actions", "Actions started")}
          onEffectiveness={() => runAction("submit-for-effectiveness", "Submitted for effectiveness check")}
          onClose={requestClose}
          onCancel={() => requestReasonAction("cancel", "Cancel CAPA", "Cancelled")}
        />
      </div>

      <section className="rounded-md bg-muted/30 p-4">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="space-y-3">
            <ReadOnlyField label="Number" value={c.capaNumber} />
            <ReadOnlyField label="Numbering" value="CAPA" />
            <ReadOnlyField label="Source" value={CAPA_SOURCE_LABELS[c.source]} />
          </div>
          <div className="space-y-3">
            <ReadOnlyField label="Date" value={formatDateTime(c.eventDate ?? c.createdAt).replace(" UTC", "")} />
            <ReadOnlyField label="Owner" value={ownerName} />
            <ReadOnlyField label="History" value={<button type="button" className="font-semibold text-brand-primary hover:underline" onClick={() => toggleSection("notes")}>View</button>} />
          </div>
        </div>
      </section>

      <section className="rounded-md bg-muted/30 p-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-h3">ABOUT:</h2>
            <OrangeBox title={`ABOUT: ${toLabel(c.aboutType ?? "CAPA")}`}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ReadOnlyField label={toLabel(c.aboutType ?? "Reference")} value={c.aboutReference || "-"} />
                <ReadOnlyField label="Format" value={about["Category / format"] ?? "-"} />
                <ReadOnlyField label="Supplier / owner" value={about["Supplier / owner"] ?? "-"} />
                <ReadOnlyField label="Serial No." value={about.Identifier ?? "-"} />
                <div className="md:col-span-2">
                  <ReadOnlyField label="Notes" value={about["Additional notes"] ?? about["Item / record"] ?? "-"} />
                </div>
              </div>
            </OrangeBox>
          </div>
          <div className="space-y-3">
            <h2 className="text-h3">PARTIES:</h2>
            <OrangeBox title={`PARTIES: ${toLabel(c.partyType ?? "Users")}`}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ReadOnlyField label="Users" value={joinName(c.partyFirstName, c.partyLastName) || c.partyCompany || "-"} />
                <ReadOnlyField label="Company" value={c.partyCompany || "-"} />
                <ReadOnlyField label="Job Title" value={c.partyJobTitle || "-"} />
                <ReadOnlyField label="Email" value={c.partyEmail || "-"} />
                <ReadOnlyField label="Telephone" value={c.partyPhone || "-"} />
              </div>
            </OrangeBox>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-md border border-border">
        <div className="grid grid-cols-1 gap-px bg-border lg:grid-cols-4">
          <StripField label="DESCRIPTION" value="" />
          <StripField label="ASSIGNED TO" value={ownerName} />
          <StripField label="PRIORITY" value={c.priority ? CAPA_PRIORITY_LABELS[c.priority] : "-"} />
          <StripField label="STATUS" value={<CapaStatusBadge status={c.status} />} />
        </div>
        <div className="bg-background p-4">
          <div className="rounded-md border border-border bg-card p-4">
            <p className="text-label text-success">Added: {ownerName} {formatDateTime(c.createdAt).replace(" UTC", "")}</p>
            <RichTextDisplay value={c.description} className="mt-1 text-body" />
          </div>
        </div>
      </section>

      <CollapsibleSection title="CONTAINMENT:" open={sections.containment} status={draft.containmentDetails ? "complete" : "empty"} onToggle={() => toggleSection("containment")}>
        <SectionTextArea
          label="Details"
          value={draft.containmentDetails}
          pending={updateDetails.isPending}
          onChange={(value) => updateDraft("containmentDetails", value)}
          onClear={() => updateDraft("containmentDetails", "")}
          onClose={() => toggleSection("containment")}
          onSubmit={() => saveDraft("Containment details updated")}
        />
      </CollapsibleSection>

      <CollapsibleSection title="KEYWORDS:" open={sections.keywords} status={draft.keywords ? "complete" : "empty"} onToggle={() => toggleSection("keywords")}>
        <div className="space-y-2">
          <Label htmlFor="capa-keywords">Keywords:</Label>
          <Input
            id="capa-keywords"
            value={draft.keywords}
            onChange={(event) => updateDraft("keywords", event.target.value)}
            placeholder="Add comma-separated keywords"
            className="border border-border bg-background"
          />
          <SectionButtons
            pending={updateDetails.isPending}
            onSubmit={() => saveDraft("Keywords updated")}
            onClear={() => updateDraft("keywords", "")}
            onClose={() => toggleSection("keywords")}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="NOTES:" open={sections.notes} status="complete" onToggle={() => toggleSection("notes")}>
        <SectionTextArea
          label="Notes"
          value={draft.assignmentComment}
          pending={updateDetails.isPending}
          onChange={(value) => updateDraft("assignmentComment", value)}
          onClear={() => updateDraft("assignmentComment", "")}
          onClose={() => toggleSection("notes")}
          onSubmit={() => saveDraft("CAPA notes updated")}
        />
        <div className="rounded-md border border-border bg-background p-4">
          <AuditTrailTable entries={audit.data} isLoading={audit.isLoading} isError={audit.isError} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="DOCUMENTS:" open={sections.documents} status={draft.documentReferences ? "complete" : "empty"} onToggle={() => toggleSection("documents")}>
        <DocumentsPanel
          references={draft.documentReferences}
          pending={updateDetails.isPending}
          onChange={(value) => updateDraft("documentReferences", value)}
          onClear={() => updateDraft("documentReferences", "")}
          onClose={() => toggleSection("documents")}
          onSubmit={() => saveDraft("Document references updated")}
        />
      </CollapsibleSection>

      <CollapsibleSection title="PAYMENT:" open={sections.payment} status="complete" onToggle={() => toggleSection("payment")}>
        <PaymentPanel onClose={() => toggleSection("payment")} />
      </CollapsibleSection>

      <CollapsibleSection title="EMAILS:" open={sections.emails} status="attention" onToggle={() => toggleSection("emails")}>
        <EmailsPanel ownerName={ownerName} capa={c} onClose={() => toggleSection("emails")} />
      </CollapsibleSection>

      <CollapsibleSection title="INVESTIGATION:" open={sections.investigation} status="complete" onToggle={() => toggleSection("investigation")}>
        <InvestigationPanel
          id={id}
          version={c.version}
          rootCause={draft.rootCause}
          editableRootCause={editableRootCause}
          users={users.data}
          onSaved={(rootCause) => updateDraft("rootCause", rootCause)}
        />
      </CollapsibleSection>

      <div className="grid grid-cols-1 gap-1 md:grid-cols-2 xl:grid-cols-4">
        <ObjectTile
          active={activeObject === "source"}
          tone="amber"
          icon={<ClipboardList className="h-7 w-7" />}
          title={CAPA_SOURCE_LABELS[draft.source]}
          value={draft.aboutReference || c.capaNumber}
          onClick={() => setActiveObject(activeObject === "source" ? null : "source")}
        />
        <ObjectTile
          active={activeObject === "root"}
          tone="rose"
          icon={<Search className="h-7 w-7" />}
          title="Root Cause"
          value={rootCause["Analysis Method"] ? `Analysis Method: ${rootCause["Analysis Method"]}` : firstTextLine(draft.rootCause)}
          onClick={() => setActiveObject(activeObject === "root" ? null : "root")}
        />
        <ObjectTile
          active={activeObject === "corrective"}
          tone="rose"
          icon={<Wrench className="h-7 w-7" />}
          title="Corrective Action"
          value={corrective["Action Required"] ?? corrective.Section ?? "-"}
          onClick={() => setActiveObject(activeObject === "corrective" ? null : "corrective")}
        />
        <ObjectTile
          active={activeObject === "preventive"}
          tone="slate"
          icon={<ShieldCheck className="h-7 w-7" />}
          title="Preventive Action"
          value={preventive["Action Required"] ?? preventive.Section ?? "-"}
          onClick={() => setActiveObject(activeObject === "preventive" ? null : "preventive")}
        />
      </div>

      {activeObject ? (
        <ObjectEditorPanel
          activeObject={activeObject}
          capa={c}
          draft={draft}
          users={users.data}
          pending={updateDetails.isPending}
          onDraftChange={updateDraft}
          onPlanChange={(field, key, value) => updateDraft(field, setKeyValue(draft[field], key, value))}
          onSave={() => saveDraft(`${objectTitle(activeObject)} details updated`)}
          onClose={() => setActiveObject(null)}
        />
      ) : null}

      <div id="capa-close-section">
      <CollapsibleSection title="CLOSE:" open={sections.close} status={c.status === "CLOSED" ? "attention" : "empty"} onToggle={() => toggleSection("close")}>
        {closeWarnings.length > 0 ? (
          <div className="rounded-md border border-warning/30 bg-warning/10 p-4 text-body">
            <p className="font-semibold">Before closing this CAPA, review the following:</p>
            <ul className="mt-2 list-disc pl-5">
              {closeWarnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </div>
        ) : (
          <p className="text-body text-muted-foreground">This CAPA has the required closure information.</p>
        )}
        <CloseCapaFields
          capa={c}
          ownerName={ownerName}
          value={closeDraft}
          onChange={setCloseDraft}
          onSubmit={() => {
            setEffResult(closeDraft.comment);
            setCloseOpen(true);
          }}
          onClear={() => setCloseDraft({ email: ownerName, comment: "", documents: "" })}
          onClose={() => toggleSection("close")}
        />
        {c.status === "PENDING_EFFECTIVENESS_CHECK" && (
          <Button onClick={requestClose} className="mt-3">Close CAPA</Button>
        )}
      </CollapsibleSection>
      </div>

      <div className="flex justify-center py-2">
        <Button className="bg-warning text-slate-950 hover:bg-warning/90" onClick={printCurrentCapaReport}>
          Print PDF
        </Button>
      </div>

      <SignatureModal
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve CAPA"
        recordNumber={c.capaNumber}
        recordTitle={c.title}
        recordNoun="CAPA"
        statusNode={<CapaStatusBadge status={c.status} />}
        isPending={approve.isPending}
        successMessage="Approved successfully"
        onSign={async (creds) => {
          await approve.mutateAsync({
            id,
            expectedVersion: c.version,
            password: creds.password,
            totpCode: creds.totpCode,
            reason: creds.reason,
            meaningStatement: creds.meaningStatement,
          });
        }}
      />

      <SignatureModal
        open={closeOpen}
        onOpenChange={(open) => {
          if (!open) setEffResult("");
          setCloseOpen(open);
        }}
        title="Close CAPA"
        recordNumber={c.capaNumber}
        recordTitle={c.title}
        recordNoun="CAPA"
        statusNode={<CapaStatusBadge status={c.status} />}
        isPending={close.isPending}
        successMessage="CAPA closed"
        onSign={async (creds) => {
          await close.mutateAsync({
            id,
            expectedVersion: c.version,
            password: creds.password,
            totpCode: creds.totpCode,
            reason: creds.reason,
            meaningStatement: creds.meaningStatement,
            effectivenessResult: effResult || undefined,
          });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="eff-result">Effectiveness result</Label>
      <RichTextEditor id="eff-result" minHeight={120} value={effResult} onChange={setEffResult} />
        </div>
      </SignatureModal>

      <Modal open={closeWarningOpen} onOpenChange={setCloseWarningOpen} title="Before closing this CAPA" className="max-w-2xl">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-20 w-20 text-warning" />
          <p className="mt-5 text-h3 text-foreground">Before closing this CAPA you should look into the following:</p>
          <ul className="mt-4 space-y-2 text-body font-semibold">
            {closeWarnings.map((warning) => <li key={warning}>- {warning}</li>)}
          </ul>
          <p className="mt-5 text-body text-muted-foreground">Click OK to ignore this pop-up and proceed to close CAPA, or Cancel to deal with the listed items.</p>
        </div>
        <ModalFooter className="justify-center gap-3 sm:justify-center">
          <Button variant="outline" onClick={() => setCloseWarningOpen(false)}>Cancel</Button>
          <Button
            className="bg-warning text-slate-950 hover:bg-warning/90"
            onClick={() => {
              setCloseWarningOpen(false);
              openCloseFields();
            }}
          >
            OK
          </Button>
        </ModalFooter>
      </Modal>

      <ReasonModal
        open={!!reasonAction}
        onOpenChange={(open) => !open && setReasonAction(null)}
        title={reasonAction?.title ?? "Workflow Action"}
        defaultReason={reasonAction?.defaultReason ?? ""}
        submitLabel="Confirm"
        isPending={transition.isPending}
        onSubmit={async (reason) => {
          if (!reasonAction) return;
          await transition.mutateAsync({ id, action: reasonAction.action, expectedVersion: c.version, reason });
        }}
      />

      <AddActionModal capaId={id} open={addOpen} onOpenChange={setAddOpen} users={users.data} />
      {printing ? <CapaPrintReport capa={c} draft={draft} actions={actions.data} ownerName={ownerName} /> : null}
    </div>
  );
}

function CapaPrintReport({
  capa,
  draft,
  actions,
  ownerName,
}: {
  capa: CapaResponse;
  draft: CapaDetailDraft;
  actions: CapaActionResponse[] | undefined;
  ownerName: string;
}) {
  const partyName = joinName(capa.partyFirstName, capa.partyLastName) ?? capa.partyCompany ?? "-";
  return (
    <article className="capa-print-report bg-white text-slate-900">
      <header className="mb-8 border-b border-slate-300 pb-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">CAPA Report</p>
        <h1 className="mt-1 text-3xl font-bold text-brand-primary">{capa.capaNumber}</h1>
        <p className="mt-2 text-sm text-slate-600">Generated {formatDateTime(new Date().toISOString()).replace(" UTC", "")}</p>
      </header>

      <section className="mb-6">
        <h2 className="mb-3 border-b border-slate-200 pb-2 text-xl font-bold text-brand-primary">Record Details</h2>
        <div className="grid grid-cols-2 gap-3">
          <PrintField label="Title" value={draft.title} />
          <PrintField label="Status" value={capa.status} />
          <PrintField label="Source" value={CAPA_SOURCE_LABELS[draft.source]} />
          <PrintField label="Owner" value={ownerName} />
          <PrintField label="Date" value={formatDateTime(capa.eventDate ?? capa.createdAt).replace(" UTC", "")} />
          <PrintField label="Due Date" value={capa.dueDate ? formatDate(capa.dueDate) : "-"} />
          <PrintField label="Priority" value={capa.priority ? CAPA_PRIORITY_LABELS[capa.priority] : "-"} />
          <PrintField label="Effectiveness Check Required" value={capa.effectivenessCheckRequired ? "Yes" : "No"} />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 border-b border-slate-200 pb-2 text-xl font-bold text-brand-primary">About And Parties</h2>
        <div className="grid grid-cols-2 gap-3">
          <PrintField label="About Type" value={toLabel(draft.aboutType || "CAPA")} />
          <PrintField label="About Reference" value={draft.aboutReference} />
          <PrintField label="Party" value={partyName} />
          <PrintField label="Party Email" value={capa.partyEmail ?? "-"} />
          <PrintField label="Party Company" value={capa.partyCompany ?? "-"} />
          <PrintField label="Party Phone" value={capa.partyPhone ?? "-"} />
        </div>
      </section>

      <PrintBlock label="Description" value={draft.description} />
      <PrintBlock label="About Details" value={draft.aboutDetails} />
      <PrintBlock label="Containment" value={draft.containmentDetails} />
      <PrintBlock label="Root Cause" value={draft.rootCause} />
      <PrintBlock label="Corrective Action" value={draft.correctiveActionPlan} />
      <PrintBlock label="Preventive Action" value={draft.preventiveActionPlan} />
      <PrintBlock label="Documents" value={draft.documentReferences} />
      <PrintBlock label="Keywords" value={draft.keywords} />
      <PrintBlock label="Notes" value={draft.assignmentComment} />

      <section className="mb-6 break-inside-avoid">
        <h2 className="mb-3 border-b border-slate-200 pb-2 text-xl font-bold text-brand-primary">Action Items</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 p-2 text-left">Type</th>
              <th className="border border-slate-300 p-2 text-left">Description</th>
              <th className="border border-slate-300 p-2 text-left">Assigned To</th>
              <th className="border border-slate-300 p-2 text-left">Due</th>
              <th className="border border-slate-300 p-2 text-left">Completed</th>
            </tr>
          </thead>
          <tbody>
            {(actions ?? []).length > 0 ? (
              (actions ?? []).map((action) => (
                <tr key={action.id}>
                  <td className="border border-slate-300 p-2">{toLabel(action.actionType)}</td>
                  <td className="border border-slate-300 p-2">{action.description || "-"}</td>
                  <td className="border border-slate-300 p-2">{action.assignedTo ? `User #${action.assignedTo}` : "-"}</td>
                  <td className="border border-slate-300 p-2">{action.dueDate ? formatDate(action.dueDate) : "-"}</td>
                  <td className="border border-slate-300 p-2">{action.completedDate ? formatDate(action.completedDate) : "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border border-slate-300 p-2" colSpan={5}>No action items recorded.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </article>
  );
}

function PrintField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-h-14 rounded-md border border-slate-300 p-3">
      <p className="mb-1 text-xs font-bold uppercase text-slate-500">{label}</p>
      <div className="text-sm">{value || "-"}</div>
    </div>
  );
}

function PrintBlock({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <section className="mb-6 break-inside-avoid">
      <h2 className="mb-3 border-b border-slate-200 pb-2 text-xl font-bold text-brand-primary">{label}</h2>
      <div className="rounded-md border border-slate-300 p-3 text-sm">
        <RichTextDisplay value={value} />
      </div>
    </section>
  );
}

function WorkflowActions({
  status,
  pending,
  onSubmitInvestigation,
  onSubmitApproval,
  onReject,
  onApprove,
  onStart,
  onEffectiveness,
  onClose,
  onCancel,
}: {
  status: CapaResponse["status"];
  pending: boolean;
  onSubmitInvestigation: () => void;
  onSubmitApproval: () => void;
  onReject: () => void;
  onApprove: () => void;
  onStart: () => void;
  onEffectiveness: () => void;
  onClose: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="ml-auto flex flex-wrap items-center gap-2">
      {status === "DRAFT" && (
        <>
          <Button onClick={onSubmitInvestigation} disabled={pending}>Submit for Investigation</Button>
          <Button variant="outline" onClick={onCancel} disabled={pending}>Cancel</Button>
        </>
      )}
      {status === "UNDER_INVESTIGATION" && <Button onClick={onSubmitApproval} disabled={pending}>Submit for Approval</Button>}
      {status === "PENDING_APPROVAL" && (
        <>
          <Button variant="outline" onClick={onReject} disabled={pending}>Reject</Button>
          <Button onClick={onApprove}>Approve</Button>
        </>
      )}
      {status === "APPROVED" && <Button onClick={onStart} disabled={pending}>Start Actions</Button>}
      {status === "IN_PROGRESS" && <Button onClick={onEffectiveness} disabled={pending}>Submit for Effectiveness</Button>}
      {status === "PENDING_EFFECTIVENESS_CHECK" && <Button onClick={onClose}>Close</Button>}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-label font-semibold text-foreground">{label}:</p>
      <div className="min-h-11 rounded-md border border-border bg-background px-4 py-3 text-body">{value}</div>
    </div>
  );
}

function OrangeBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border border-warning/70 bg-muted/20">
      <div className="border-b border-warning/30 bg-warning/20 px-4 py-3">
        <h3 className="text-body font-semibold">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StripField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center gap-2 bg-muted px-4 py-3">
      <span className="text-label font-semibold">{label}:</span>
      <span className="text-body">{value}</span>
    </div>
  );
}

function CollapsibleSection({
  title,
  open,
  status,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  status: "complete" | "attention" | "empty";
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-border">
      <button type="button" className="flex min-h-14 w-full items-center gap-3 bg-slate-200 px-4 py-3 text-left" onClick={onToggle}>
        <span className="text-body font-semibold">{title}</span>
        <StatusDot status={status} />
        <span className="ml-auto text-muted-foreground">{open ? <MinusCircle className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}</span>
      </button>
      {open ? <div className="space-y-4 bg-muted/30 p-4">{children}</div> : null}
    </section>
  );
}

function StatusDot({ status }: { status: "complete" | "attention" | "empty" }) {
  if (status === "attention") return <CheckCircle2 className="h-5 w-5 text-rose-700" />;
  if (status === "complete") return <CheckCircle2 className="h-5 w-5 text-success" />;
  return <PlusCircle className="h-5 w-5 text-success" />;
}

function SectionTextArea({
  label,
  value,
  pending = false,
  onChange,
  onSubmit,
  onClear,
  onClose,
}: {
  label: string;
  value: string;
  pending?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}:</Label>
      <RichTextEditor value={value} minHeight={190} onChange={onChange} aria-invalid={false} />
      <SectionButtons pending={pending} onSubmit={onSubmit} onClear={onClear} onClose={onClose} />
    </div>
  );
}

function SectionButtons({
  pending = false,
  onSubmit,
  onClear,
  onClose,
}: {
  pending?: boolean;
  onSubmit: () => void;
  onClear: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" className="bg-warning text-slate-950 hover:bg-warning/90" disabled={pending} onClick={onSubmit}>
        {pending ? "Saving..." : "Submit"}
      </Button>
      <Button type="button" variant="outline" disabled={pending} onClick={onClear}>Clear</Button>
      <Button type="button" variant="secondary" disabled={pending || !onClose} onClick={onClose}>Close</Button>
    </div>
  );
}

function DocumentsPanel({
  references,
  pending,
  onChange,
  onSubmit,
  onClear,
  onClose,
}: {
  references: string;
  pending: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const lines = splitLines(references);
  return (
    <div className="space-y-4">
      <div className="max-w-2xl space-y-2">
        <Label>Select &amp; Search Internal Documents:</Label>
        <div className="flex">
          <Input placeholder="Search here..." className="border border-border bg-background" />
          <Button type="button" variant="outline" size="icon"><Search className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TransferShell title={lines.length ? `Showing all ${lines.length}` : "Empty list"} items={lines} />
        <TransferShell title="Selected" items={[]} />
      </div>
      <div className="space-y-2">
        <Label>Document References:</Label>
        <RichTextEditor value={references} minHeight={140} onChange={onChange} />
      </div>
      <div className="space-y-2">
        <Label>External Documents:</Label>
        <Button type="button" className="bg-warning text-slate-950 hover:bg-warning/90">Click to Upload</Button>
      </div>
      <SectionButtons pending={pending} onSubmit={onSubmit} onClear={onClear} onClose={onClose} />
    </div>
  );
}

function TransferShell({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-border bg-background">
      <div className="border-b border-border p-3">
        <p className="text-body">{title}</p>
        <Input className="mt-2 border border-border bg-background" placeholder="Filter" />
      </div>
      <div className="h-40 overflow-y-auto p-3">
        {items.length === 0 ? <p className="text-label text-muted-foreground">Empty list</p> : items.map((item) => <p key={item} className="text-body">{item}</p>)}
      </div>
    </div>
  );
}

function PaymentPanel({ onClose }: { onClose: () => void }) {
  const [payment, setPayment] = useState({ reason: "", method: "", currency: "", amount: "", details: "" });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="payment-reason">Reason:</Label>
          <Select id="payment-reason" value={payment.reason} onChange={(event) => setPayment((current) => ({ ...current, reason: event.target.value }))}>
            <option value="">Select</option>
            <option value="Refund">Refund</option>
            <option value="Replacement">Replacement</option>
            <option value="Service credit">Service credit</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="payment-method">Method:</Label>
          <Select id="payment-method" value={payment.method} onChange={(event) => setPayment((current) => ({ ...current, method: event.target.value }))}>
            <option value="">Select</option>
            <option value="Bank transfer">Bank transfer</option>
            <option value="Credit note">Credit note</option>
            <option value="Cash">Cash</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="payment-currency">Currency:</Label>
          <Select id="payment-currency" value={payment.currency} onChange={(event) => setPayment((current) => ({ ...current, currency: event.target.value }))}>
            <option value="">Select</option>
            <option value="KES">KES</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="payment-amount">Amount:</Label>
          <Input id="payment-amount" value={payment.amount} onChange={(event) => setPayment((current) => ({ ...current, amount: event.target.value }))} />
        </div>
      </div>
      <SectionTextArea
        label="Details"
        value={payment.details}
        onChange={(details) => setPayment((current) => ({ ...current, details }))}
        onSubmit={() => toast.success("Payment details updated in this form")}
        onClear={() => setPayment({ reason: "", method: "", currency: "", amount: "", details: "" })}
        onClose={onClose}
      />
    </div>
  );
}

function EmailsPanel({ ownerName, capa, onClose }: { ownerName: string; capa: CapaResponse; onClose: () => void }) {
  const [email, setEmail] = useState({
    to: ownerName,
    fromName: "Super Admin",
    fromEmail: "hello@einsbrand.com",
    cc: "",
    subject: `${capa.capaNumber} - ${capa.title}`,
    body: "",
  });
  return (
    <div className="space-y-4 bg-warning/20 p-4">
      <div className="space-y-2">
        <p className="text-body font-semibold"><MinusCircle className="mr-2 inline h-5 w-5 text-success" />Send Email</p>
        <LabeledInput label="To Email" value={email.to} onChange={(to) => setEmail((current) => ({ ...current, to }))} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <LabeledInput label="From Name" value={email.fromName} onChange={(fromName) => setEmail((current) => ({ ...current, fromName }))} />
        <LabeledInput label="From Email" value={email.fromEmail} onChange={(fromEmail) => setEmail((current) => ({ ...current, fromEmail }))} />
        <LabeledInput label="Email CC" value={email.cc} onChange={(cc) => setEmail((current) => ({ ...current, cc }))} />
      </div>
      <LabeledInput label="Email Subject" value={email.subject} onChange={(subject) => setEmail((current) => ({ ...current, subject }))} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <SectionTextArea
          label="Email Body & Signature"
          value={email.body}
          onChange={(body) => setEmail((current) => ({ ...current, body }))}
          onSubmit={() => toast.success("Email draft updated in this form")}
          onClear={() => setEmail((current) => ({ ...current, body: "" }))}
          onClose={onClose}
        />
        <div className="rounded-md border border-border bg-background">
          <div className="border-b border-border p-3 text-body font-semibold">Macros</div>
          {["{First Name}", "{Last Name}", "{Company}", "{Number}"].map((macro) => <div key={macro} className="border-b border-border p-3 text-body">{macro}</div>)}
        </div>
      </div>
      <p className="text-body font-semibold"><PlusCircle className="mr-2 inline h-5 w-5 text-success" />Select Template</p>
      <div className="overflow-x-auto rounded-md border border-border bg-background">
        <table className="w-full min-w-[720px] text-body">
          <thead className="bg-slate-200 text-left">
            <tr>
              <th className="px-4 py-2">Choose</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Email Template Name</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {EMAIL_TEMPLATES.map(([status, name]) => (
              <tr key={status} className="border-t border-border">
                <td className="px-4 py-2"><input type="radio" /></td>
                <td className="px-4 py-2">{status}</td>
                <td className="px-4 py-2">{name}</td>
                <td className="px-4 py-2"><button type="button" className="text-brand-primary hover:underline">Click Here to Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}:</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} className="border border-border bg-background" />
    </div>
  );
}

function RichTextDisplay({ value, className }: { value: string | null | undefined; className?: string }) {
  const html = sanitizeRichText(value);
  if (!html) return <p className={cn("text-body text-muted-foreground", className)}>-</p>;
  return <div className={cn("rich-text-content", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

function InvestigationPanel({
  id,
  version,
  rootCause,
  editableRootCause,
  users,
  onSaved,
}: {
  id: number;
  version: number;
  rootCause: string | null;
  editableRootCause: boolean;
  users: { id: number; fullName: string }[] | undefined;
  onSaved: (rootCause: string) => void;
}) {
  const update = useUpdateCapaRootCause();
  const [value, setValue] = useState(rootCause ?? "");
  return (
    <div className="space-y-4 bg-warning/20 p-4">
      <div>
        <p className="text-body font-semibold"><MinusCircle className="mr-2 inline h-5 w-5 text-success" />Add Investigation Details</p>
        <Label className="mt-3 block">Investigation Details:</Label>
        <RichTextEditor value={value} minHeight={220} disabled={!editableRootCause} onChange={setValue} />
      </div>
      <div className="space-y-2">
        <Label>Documents:</Label>
        <Button type="button" className="bg-warning text-slate-950 hover:bg-warning/90">Click to Upload</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={!editableRootCause || update.isPending || value.trim().length === 0}
          className="bg-warning text-slate-950 hover:bg-warning/90"
          onClick={async () => {
            try {
              await update.mutateAsync({ id, expectedVersion: version, rootCause: value, reason: "Investigation details updated" });
              onSaved(value);
              toast.success("Investigation details saved");
            } catch {
              /* interceptor */
            }
          }}
        >
          Submit
        </Button>
        <Button type="button" variant="outline" onClick={() => setValue(rootCause ?? "")}>Clear</Button>
        <Button type="button" variant="secondary">Close</Button>
      </div>
      <div className="space-y-3">
        <p className="text-body font-semibold"><PlusCircle className="mr-2 inline h-5 w-5 text-success" />Send an Investigation Notification</p>
        <TransferShell title={`Showing all ${users?.length ?? 0}`} items={users?.map((user) => user.fullName) ?? []} />
      </div>
    </div>
  );
}

function ObjectEditorPanel({
  activeObject,
  capa,
  draft,
  users,
  pending,
  onDraftChange,
  onPlanChange,
  onSave,
  onClose,
}: {
  activeObject: ObjectKey;
  capa: CapaResponse;
  draft: CapaDetailDraft;
  users: { id: number; fullName: string }[] | undefined;
  pending: boolean;
  onDraftChange: DraftChangeHandler;
  onPlanChange: (field: "correctiveActionPlan" | "preventiveActionPlan", key: string, value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const root = parseKeyValueBlock(draft.rootCause);

  return (
    <section className="overflow-hidden rounded-md border border-warning/40 bg-warning/20">
      <div className="border-t-4 border-warning bg-muted/40 px-4 py-3">
        <h2 className="text-h3">{objectTitle(activeObject)}</h2>
      </div>
      <div className="space-y-4 p-4">
        {activeObject === "source" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" className="bg-warning text-slate-950 hover:bg-warning/90">Record New NC</Button>
              <p className="text-label text-success">Added: {formatDateTime(capa.createdAt).replace(" UTC", "")}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <LabeledInput label="CAPA Number" value={capa.capaNumber} onChange={() => undefined} />
              <div className="space-y-1.5">
                <Label htmlFor="source-type">Source:</Label>
                <Select id="source-type" value={draft.source} onChange={(event) => onDraftChange("source", event.target.value as CapaResponse["source"])}>
                  {(Object.keys(CAPA_SOURCE_LABELS) as CapaResponse["source"][]).map((source) => (
                    <option key={source} value={source}>{CAPA_SOURCE_LABELS[source]}</option>
                  ))}
                </Select>
              </div>
              <LabeledInput label="Linked Object" value={draft.aboutReference} onChange={(value) => onDraftChange("aboutReference", value)} />
            </div>
            <LabeledInput label="Title" value={draft.title} onChange={(value) => onDraftChange("title", value)} />
            <SectionTextArea
              label="Description"
              value={draft.description}
              pending={pending}
              onChange={(value) => onDraftChange("description", value)}
              onSubmit={onSave}
              onClear={() => onDraftChange("description", "")}
              onClose={onClose}
            />
            <SectionTextArea
              label="Object Details"
              value={draft.aboutDetails}
              pending={pending}
              onChange={(value) => onDraftChange("aboutDetails", value)}
              onSubmit={onSave}
              onClear={() => onDraftChange("aboutDetails", "")}
              onClose={onClose}
            />
          </div>
        ) : null}

        {activeObject === "root" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" className="bg-success text-white hover:bg-success/90">Add Root Cause</Button>
              <p className="text-label text-success">Added: {formatDateTime(capa.createdAt).replace(" UTC", "")}</p>
            </div>
            <div className="max-w-lg space-y-1.5">
              <Label htmlFor="root-method">Analysis Method:</Label>
              <Select
                id="root-method"
                value={root["Analysis Method"] ?? ""}
                onChange={(event) => onDraftChange("rootCause", setKeyValue(draft.rootCause, "Analysis Method", event.target.value))}
              >
                <option value="">Select</option>
                <option value="5 Whys">5 Whys</option>
                <option value="3 x 5 Whys">3 x 5 Whys</option>
                <option value="5 x 5 Whys">5 x 5 Whys</option>
                <option value="Fishbone">Fishbone</option>
                <option value="Other">Other</option>
              </Select>
            </div>
            <SectionTextArea
              label="Root Cause Statement"
              value={root["Root Cause Statement"] ?? firstTextLine(draft.rootCause)}
              pending={pending}
              onChange={(value) => onDraftChange("rootCause", setKeyValue(draft.rootCause, "Root Cause Statement", value))}
              onSubmit={onSave}
              onClear={() => onDraftChange("rootCause", "")}
              onClose={onClose}
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <ReadOnlyField label="Corrective Action" value={firstTextLine(draft.correctiveActionPlan)} />
              <ReadOnlyField label="Preventive Action" value={firstTextLine(draft.preventiveActionPlan)} />
              <ReadOnlyField label="Related Record" value={draft.aboutReference || capa.capaNumber} />
            </div>
          </div>
        ) : null}

        {activeObject === "corrective" ? (
          <ActionPlanEditor
            title="Corrective Action"
            plan={draft.correctiveActionPlan}
            field="correctiveActionPlan"
            users={users}
            pending={pending}
            onPlanChange={onPlanChange}
            onSave={onSave}
            onClose={onClose}
          />
        ) : null}

        {activeObject === "preventive" ? (
          <ActionPlanEditor
            title="Preventive Action"
            plan={draft.preventiveActionPlan}
            field="preventiveActionPlan"
            users={users}
            pending={pending}
            onPlanChange={onPlanChange}
            onSave={onSave}
            onClose={onClose}
          />
        ) : null}
      </div>
    </section>
  );
}

function ActionPlanEditor({
  title,
  plan,
  field,
  users,
  pending,
  onPlanChange,
  onSave,
  onClose,
}: {
  title: string;
  plan: string;
  field: "correctiveActionPlan" | "preventiveActionPlan";
  users: { id: number; fullName: string }[] | undefined;
  pending: boolean;
  onPlanChange: (field: "correctiveActionPlan" | "preventiveActionPlan", key: string, value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const data = parseKeyValueBlock(plan);
  return (
    <div className="space-y-4">
      <Button type="button" className="bg-success text-white hover:bg-success/90">Add another {title}</Button>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LabeledInput label="Implementation Target Date" value={data["Implementation Target Date"] ?? ""} onChange={(value) => onPlanChange(field, "Implementation Target Date", value)} />
        <LabeledInput label="Effectiveness Target Date" value={data["Effectiveness Target Date"] ?? ""} onChange={(value) => onPlanChange(field, "Effectiveness Target Date", value)} />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-3 rounded-md border border-border bg-muted/40 p-4">
          <h3 className="text-body font-semibold">Action Required:</h3>
          <p className="text-label text-error">Assign responsibility, define the required work, and attach supporting documents.</p>
          <div className="space-y-1.5">
            <Label>Responsibility:</Label>
            <Select value={data.Responsibility ?? ""} onChange={(event) => onPlanChange(field, "Responsibility", event.target.value)}>
              <option value="">Select</option>
              <option value="Owner">Owner</option>
              <option value="Department">Department</option>
              <option value="Named User">Named User</option>
            </Select>
          </div>
          <TransferShell title={`Showing all ${users?.length ?? 0}`} items={users?.map((user) => user.fullName) ?? []} />
          <SectionTextArea
            label="Action Required"
            value={data["Action Required"] ?? ""}
            pending={pending}
            onChange={(value) => onPlanChange(field, "Action Required", value)}
            onSubmit={onSave}
            onClear={() => onPlanChange(field, "Action Required", "")}
            onClose={onClose}
          />
        </div>
        <div className="space-y-3 rounded-md border border-border bg-muted/40 p-4">
          <h3 className="text-body font-semibold">Action Taken:</h3>
          <LabeledInput label="Completed By" value={data["Completed By"] ?? ""} onChange={(value) => onPlanChange(field, "Completed By", value)} />
          <LabeledInput label="Completion Date" value={data["Completion Date"] ?? ""} onChange={(value) => onPlanChange(field, "Completion Date", value)} />
          <SectionTextArea
            label="Action Taken"
            value={data["Action Taken"] ?? ""}
            pending={pending}
            onChange={(value) => onPlanChange(field, "Action Taken", value)}
            onSubmit={onSave}
            onClear={() => onPlanChange(field, "Action Taken", "")}
            onClose={onClose}
          />
        </div>
        <div className="space-y-3 rounded-md border border-border bg-muted/40 p-4">
          <h3 className="text-body font-semibold">Effectiveness:</h3>
          <LabeledInput label="Reviewed By" value={data["Reviewed By"] ?? ""} onChange={(value) => onPlanChange(field, "Reviewed By", value)} />
          <LabeledInput label="Review Date" value={data["Review Date"] ?? ""} onChange={(value) => onPlanChange(field, "Review Date", value)} />
          <SectionTextArea
            label="Effectiveness"
            value={data.Effectiveness ?? ""}
            pending={pending}
            onChange={(value) => onPlanChange(field, "Effectiveness", value)}
            onSubmit={onSave}
            onClear={() => onPlanChange(field, "Effectiveness", "")}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}

function CloseCapaFields({
  capa,
  ownerName,
  value,
  onChange,
  onSubmit,
  onClear,
  onClose,
}: {
  capa: CapaResponse;
  ownerName: string;
  value: { email: string; comment: string; documents: string };
  onChange: (value: { email: string; comment: string; documents: string }) => void;
  onSubmit: () => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="max-w-lg">
        <ReadOnlyField label="Status" value="Closed" />
      </div>
      <div className="space-y-2">
        <Label>Email:</Label>
        <label className="flex flex-wrap items-center gap-2 text-body">
          <input
            type="radio"
            checked={Boolean(value.email)}
            onChange={() => onChange({ ...value, email: value.email || ownerName })}
          />
          <span className="font-semibold text-brand-primary">Choose Email</span>
          <Input
            value={value.email}
            onChange={(event) => onChange({ ...value, email: event.target.value })}
            className="max-w-sm border border-border bg-background"
            placeholder="Recipient email or user"
          />
        </label>
      </div>
      <div className="space-y-2">
        <Label>Comment:</Label>
        <RichTextEditor value={value.comment} minHeight={190} onChange={(comment) => onChange({ ...value, comment })} />
      </div>
      <div className="space-y-2">
        <Label>Documents:</Label>
        <RichTextEditor value={value.documents} minHeight={130} onChange={(documents) => onChange({ ...value, documents })} />
        <Button type="button" className="bg-warning text-slate-950 hover:bg-warning/90">Click to Upload</Button>
      </div>
      <SectionButtons onSubmit={onSubmit} onClear={onClear} onClose={onClose} />
      <p className="text-label text-muted-foreground">Submitting opens the required electronic signature to close {capa.capaNumber}.</p>
    </div>
  );
}

function ObjectTile({
  tone,
  icon,
  title,
  value,
  active,
  onClick,
}: {
  tone: "amber" | "rose" | "slate";
  icon: ReactNode;
  title: string;
  value: string | null;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-32 border-t-4 bg-slate-200 p-4 text-left transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-ring",
        tone === "amber" && "border-warning bg-warning/20",
        tone === "rose" && "border-rose-700",
        tone === "slate" && "border-slate-400",
        active && "bg-warning/30 ring-2 ring-warning"
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("text-slate-600", tone === "amber" && "text-warning", tone === "rose" && "text-rose-700")}>{icon}</span>
        <div className="min-w-0">
          <h3 className="text-body font-semibold uppercase">{title}</h3>
          <p className="mt-2 break-words text-body text-brand-primary">{value || "-"}</p>
        </div>
      </div>
    </button>
  );
}

function AddActionModal({
  capaId,
  open,
  onOpenChange,
  users,
}: {
  capaId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: { id: number; fullName: string }[] | undefined;
}) {
  const add = useAddCapaAction();
  const [actionType, setActionType] = useState<CapaActionTypeKey>("CORRECTIVE");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");

  function reset() {
    setActionType("CORRECTIVE");
    setDescription("");
    setAssignedTo("");
    setDueDate("");
  }

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) reset();
        onOpenChange(nextOpen);
      }}
      title="Add Action"
      description="Define a corrective or preventive action."
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="a-type">Type</Label>
          <Select id="a-type" value={actionType} onChange={(event) => setActionType(event.target.value as CapaActionTypeKey)}>
            <option value="CORRECTIVE">Corrective</option>
            <option value="PREVENTIVE">Preventive</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="a-desc">Description</Label>
          <Textarea id="a-desc" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="a-assignee">Assignee</Label>
            <Select id="a-assignee" value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}>
              <option value="">Unassigned</option>
              {users?.map((user) => <option key={user.id} value={String(user.id)}>{user.fullName}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a-due">Due date</Label>
            <Input id="a-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </div>
        </div>
      </div>
      <ModalFooter className="gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={add.isPending}>Cancel</Button>
        <Button
          disabled={add.isPending || description.trim().length === 0}
          onClick={async () => {
            try {
              await add.mutateAsync({
                id: capaId,
                actionType,
                description,
                assignedTo: assignedTo ? Number(assignedTo) : null,
                dueDate: dueDate ? `${dueDate}T00:00:00Z` : null,
              });
              toast.success("Action added");
              reset();
              onOpenChange(false);
            } catch {
              /* interceptor */
            }
          }}
        >
          {add.isPending ? "Adding..." : "Add Action"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function closingWarnings(capa: CapaResponse, actions: CapaActionResponse[] | undefined) {
  const warnings: string[] = [];
  const hasRootCause = Boolean(capa.rootCause?.trim());
  const hasCorrective = Boolean(capa.correctiveActionPlan?.trim()) || Boolean(actions?.some((action) => action.actionType === "CORRECTIVE"));
  const hasPreventive = Boolean(capa.preventiveActionPlan?.trim()) || Boolean(actions?.some((action) => action.actionType === "PREVENTIVE"));
  if (hasRootCause && !hasCorrective && !hasPreventive) {
    warnings.push(`Have a CA or PA for: ${capa.capaNumber}`);
  }
  if (!hasRootCause) warnings.push("Record investigation/root cause details");
  return warnings;
}

function draftFromCapa(capa: CapaResponse): CapaDetailDraft {
  return {
    title: capa.title,
    source: capa.source,
    description: capa.description,
    aboutType: capa.aboutType ?? "",
    aboutReference: capa.aboutReference ?? "",
    aboutDetails: capa.aboutDetails ?? "",
    containmentDetails: capa.containmentDetails ?? "",
    documentReferences: capa.documentReferences ?? "",
    keywords: capa.keywords ?? "",
    assignmentComment: capa.assignmentComment ?? "",
    rootCause: capa.rootCause ?? "",
    correctiveActionPlan: capa.correctiveActionPlan ?? "",
    preventiveActionPlan: capa.preventiveActionPlan ?? "",
  };
}

function buildUpdatePayload(capa: CapaResponse, draft: CapaDetailDraft, reason: string): UpdateCapaDetailsInput {
  return {
    id: capa.id,
    expectedVersion: capa.version,
    reason,
    title: draft.title,
    source: draft.source,
    description: draft.description,
    effectivenessCheckRequired: capa.effectivenessCheckRequired,
    dueDate: capa.dueDate,
    eventDate: capa.eventDate,
    priority: capa.priority,
    aboutType: draft.aboutType,
    aboutReference: draft.aboutReference,
    aboutDetails: draft.aboutDetails,
    partyType: capa.partyType,
    partyFirstName: capa.partyFirstName,
    partyLastName: capa.partyLastName,
    partyJobTitle: capa.partyJobTitle,
    partyCompany: capa.partyCompany,
    partyEmail: capa.partyEmail,
    partyPhone: capa.partyPhone,
    containmentDetails: draft.containmentDetails,
    documentReferences: draft.documentReferences,
    keywords: draft.keywords,
    rootCause: draft.rootCause,
    correctiveActionPlan: draft.correctiveActionPlan,
    preventiveActionPlan: draft.preventiveActionPlan,
    assignedTo: capa.assignedTo,
    assignmentStatus: capa.assignmentStatus,
    assignmentComment: draft.assignmentComment,
  };
}

function objectTitle(value: ObjectKey) {
  if (value === "source") return "Non-Conformance / Source";
  if (value === "root") return "Root Cause";
  if (value === "corrective") return "Corrective Action";
  return "Preventive Action";
}

function setKeyValue(source: string | null, key: string, value: string) {
  const current = parseKeyValueBlock(source);
  if (value.trim()) current[key] = value.trim();
  else delete current[key];
  return Object.entries(current)
    .map(([entryKey, entryValue]) => `${entryKey}: ${entryValue}`)
    .join("\n");
}

function sanitizeRichText(value: string | null | undefined) {
  if (!value) return "";
  if (!looksLikeHtml(value)) return escapeHtml(value).replace(/\r?\n/g, "<br />");
  return sanitizeHtml(value);
}

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function stripRichText(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|li|h[1-6]|blockquote)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseKeyValueBlock(value: string | null) {
  const result: Record<string, string> = {};
  splitLines(value).forEach((line) => {
    const index = line.indexOf(":");
    if (index > -1) result[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  });
  return result;
}

function splitLines(value: string | null) {
  return stripRichText(value).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function firstTextLine(value: string | null) {
  const nonPair = splitLines(value).find((line) => !line.includes(":"));
  return nonPair ?? "-";
}

function joinName(firstName: string | null, lastName: string | null) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || null;
}

function toLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
