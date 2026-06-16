"use client";

import { useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import {
  Archive,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FilePlus2,
  Minus,
  Paperclip,
  Search,
  Settings,
  ShieldCheck,
  Tags,
  Timer,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useCreateCapa, useCapaTransition } from "@/hooks/useCapa";
import { useDocumentList, useUsers } from "@/hooks/useDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select } from "@/components/ui/select";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CAPA_PRIORITY_LABELS,
  CAPA_SOURCE_LABELS,
  type CapaPriority,
  type CapaSource,
} from "@/types/capa";

const SOURCES = Object.keys(CAPA_SOURCE_LABELS) as CapaSource[];
const PRIORITIES = Object.keys(CAPA_PRIORITY_LABELS) as CapaPriority[];
const ABOUT_TYPES = ["PRODUCT", "PROCESS", "EQUIPMENT", "MATERIAL", "SUPPLIER", "DOCUMENT", "OTHER"] as const;
const PARTY_TYPES = ["CUSTOMER", "SUPPLIER", "INTERNAL", "REGULATORY", "OTHER"] as const;
const ASSIGNMENT_STATUSES = ["UNASSIGNED", "ASSIGNED", "PENDING_RESPONSE", "ESCALATED"] as const;
const ROOT_CAUSE_METHODS = ["", "5_WHYS", "THREE_X_FIVE_WHYS", "FIVE_X_FIVE_WHYS", "FISHBONE", "OTHER"] as const;
const RESPONSIBILITY_OPTIONS = ["INDIVIDUAL", "QA", "OPERATIONS", "ENGINEERING", "SUPPLIER", "CROSS_FUNCTIONAL"] as const;

const schema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  source: z.enum(["DEVIATION", "AUDIT_FINDING", "COMPLAINT", "OOS", "SUPPLIER", "INTERNAL", "OTHER"]),
  description: z.string().trim().min(1, "Problem description is required"),
  eventDate: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["CRITICAL", "MAJOR", "MINOR", "NA"]),
  aboutType: z.enum(["PRODUCT", "PROCESS", "EQUIPMENT", "MATERIAL", "SUPPLIER", "DOCUMENT", "OTHER"]),
  aboutReference: z.string().optional(),
  aboutItemName: z.string().optional(),
  aboutCategory: z.string().optional(),
  aboutSupplier: z.string().optional(),
  aboutIdentifier: z.string().optional(),
  aboutNotes: z.string().optional(),
  partyType: z.enum(["CUSTOMER", "SUPPLIER", "INTERNAL", "REGULATORY", "OTHER"]),
  partyCompany: z.string().optional(),
  partyFirstName: z.string().optional(),
  partyLastName: z.string().optional(),
  partyJobTitle: z.string().optional(),
  partyEmail: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, "Enter a valid email"),
  partyPhone: z.string().optional(),
  containmentDetails: z.string().optional(),
  rootCauseMethod: z.enum(["", "5_WHYS", "THREE_X_FIVE_WHYS", "FIVE_X_FIVE_WHYS", "FISHBONE", "OTHER"]),
  rootCause: z.string().optional(),
  correctiveImplementationTargetDate: z.string().optional(),
  correctiveEffectivenessTargetDate: z.string().optional(),
  correctiveResponsibilityType: z.string().optional(),
  correctiveActionRequired: z.string().optional(),
  correctiveActionTaken: z.string().optional(),
  correctiveEffectiveness: z.string().optional(),
  correctiveNotificationRequired: z.boolean().optional(),
  correctiveActionPlan: z.string().optional(),
  preventiveImplementationTargetDate: z.string().optional(),
  preventiveEffectivenessTargetDate: z.string().optional(),
  preventiveResponsibilityType: z.string().optional(),
  preventiveActionRequired: z.string().optional(),
  preventiveActionTaken: z.string().optional(),
  preventiveEffectiveness: z.string().optional(),
  preventiveNotificationRequired: z.boolean().optional(),
  preventiveActionPlan: z.string().optional(),
  assignedTo: z.string().optional(),
  assignmentStatus: z.enum(["UNASSIGNED", "ASSIGNED", "PENDING_RESPONSE", "ESCALATED"]),
  assignmentComment: z.string().optional(),
  effectivenessCheckRequired: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;
type RichFieldName =
  | "aboutNotes"
  | "description"
  | "containmentDetails"
  | "rootCause"
  | "correctiveActionRequired"
  | "correctiveActionTaken"
  | "correctiveEffectiveness"
  | "preventiveActionRequired"
  | "preventiveActionTaken"
  | "preventiveEffectiveness"
  | "assignmentComment";

type ExpandableKey = "containment" | "documents" | "keywords";

function defaultValues(): FormValues {
  return {
    source: "DEVIATION",
    priority: "MAJOR",
    aboutType: "PRODUCT",
    partyType: "CUSTOMER",
    assignmentStatus: "UNASSIGNED",
    eventDate: toDateTimeLocal(new Date()),
    title: "",
    description: "",
    dueDate: "",
    aboutReference: "",
    aboutItemName: "",
    aboutCategory: "",
    aboutSupplier: "",
    aboutIdentifier: "",
    aboutNotes: "",
    partyCompany: "",
    partyFirstName: "",
    partyLastName: "",
    partyJobTitle: "",
    partyEmail: "",
    partyPhone: "",
    containmentDetails: "",
    rootCauseMethod: "",
    rootCause: "",
    correctiveImplementationTargetDate: "",
    correctiveEffectivenessTargetDate: "",
    correctiveResponsibilityType: "",
    correctiveActionRequired: "",
    correctiveActionTaken: "",
    correctiveEffectiveness: "",
    correctiveNotificationRequired: false,
    correctiveActionPlan: "",
    preventiveImplementationTargetDate: "",
    preventiveEffectivenessTargetDate: "",
    preventiveResponsibilityType: "",
    preventiveActionRequired: "",
    preventiveActionTaken: "",
    preventiveEffectiveness: "",
    preventiveNotificationRequired: false,
    preventiveActionPlan: "",
    assignedTo: "",
    assignmentComment: "",
    effectivenessCheckRequired: false,
  };
}

export default function CreateCapaPage() {
  const router = useRouter();
  const create = useCreateCapa();
  const transition = useCapaTransition();
  const usersQuery = useUsers();
  const documentsQuery = useDocumentList({ page: 0, size: 100, sort: "title,asc" });
  const [serverError, setServerError] = useState<string | null>(null);
  const [showAboutDetails, setShowAboutDetails] = useState(true);
  const [showPartyDetails, setShowPartyDetails] = useState(true);
  const [expanded, setExpanded] = useState<Record<ExpandableKey, boolean>>({
    containment: false,
    documents: false,
    keywords: false,
  });
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [documentSearch, setDocumentSearch] = useState("");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<number[]>([]);
  const [externalFiles, setExternalFiles] = useState<string[]>([]);
  const [activeActionPanel, setActiveActionPanel] = useState<"root" | "corrective" | "preventive">("root");
  const [correctiveSelectedIds, setCorrectiveSelectedIds] = useState<number[]>([]);
  const [preventiveSelectedIds, setPreventiveSelectedIds] = useState<number[]>([]);
  const [correctiveSearch, setCorrectiveSearch] = useState("");
  const [preventiveSearch, setPreventiveSearch] = useState("");
  const [correctiveSelectedFilter, setCorrectiveSelectedFilter] = useState("");
  const [preventiveSelectedFilter, setPreventiveSelectedFilter] = useState("");
  const [correctiveFiles, setCorrectiveFiles] = useState<string[]>([]);
  const [preventiveFiles, setPreventiveFiles] = useState<string[]>([]);
  const [correctiveSections, setCorrectiveSections] = useState({
    required: true,
    taken: false,
    effectiveness: false,
  });
  const [preventiveSections, setPreventiveSections] = useState({
    required: true,
    taken: false,
    effectiveness: false,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(),
  });

  const busy = create.isPending || transition.isPending;
  const documents = documentsQuery.data?.content ?? [];
  const selectedDocuments = useMemo(
    () => documents.filter((document) => selectedDocumentIds.includes(document.id)),
    [documents, selectedDocumentIds]
  );
  const availableDocuments = useMemo(() => {
    const q = documentSearch.trim().toLowerCase();
    return documents.filter((document) => {
      if (selectedDocumentIds.includes(document.id)) return false;
      if (!q) return true;
      const haystack = `${document.documentNumber} ${document.title}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [documentSearch, documents, selectedDocumentIds]);
  const allUsers = usersQuery.data ?? [];

  function richEditor(field: RichFieldName, minHeight = 180, invalid = false) {
    return (
      <RichTextEditor
        id={field}
        value={watch(field) ?? ""}
        minHeight={minHeight}
        aria-invalid={invalid}
        onChange={(value) => setValue(field, value, { shouldDirty: true, shouldValidate: true })}
      />
    );
  }
  const correctiveAvailableUsers = useMemo(
    () => filterAssignableUsers(allUsers, correctiveSelectedIds, correctiveSearch),
    [allUsers, correctiveSearch, correctiveSelectedIds]
  );
  const correctiveSelectedUsers = useMemo(
    () => filterChosenUsers(allUsers, correctiveSelectedIds, correctiveSelectedFilter),
    [allUsers, correctiveSelectedFilter, correctiveSelectedIds]
  );
  const preventiveAvailableUsers = useMemo(
    () => filterAssignableUsers(allUsers, preventiveSelectedIds, preventiveSearch),
    [allUsers, preventiveSearch, preventiveSelectedIds]
  );
  const preventiveSelectedUsers = useMemo(
    () => filterChosenUsers(allUsers, preventiveSelectedIds, preventiveSelectedFilter),
    [allUsers, preventiveSelectedFilter, preventiveSelectedIds]
  );

  function toggleSection(key: ExpandableKey) {
    setExpanded((current) => ({ ...current, [key]: !current[key] }));
  }

  function resetExtras() {
    setShowAboutDetails(true);
    setShowPartyDetails(true);
    setExpanded({ containment: false, documents: false, keywords: false });
    setKeywordInput("");
    setKeywords([]);
    setDocumentSearch("");
    setSelectedDocumentIds([]);
    setExternalFiles([]);
    setActiveActionPanel("root");
    setCorrectiveSelectedIds([]);
    setPreventiveSelectedIds([]);
    setCorrectiveSearch("");
    setPreventiveSearch("");
    setCorrectiveSelectedFilter("");
    setPreventiveSelectedFilter("");
    setCorrectiveFiles([]);
    setPreventiveFiles([]);
    setCorrectiveSections({ required: true, taken: false, effectiveness: false });
    setPreventiveSections({ required: true, taken: false, effectiveness: false });
    setServerError(null);
    reset(defaultValues());
  }

  function addKeyword() {
    const next = keywordInput.trim();
    if (!next) return;
    if (!keywords.some((keyword) => keyword.toLowerCase() === next.toLowerCase())) {
      setKeywords((current) => [...current, next]);
    }
    setKeywordInput("");
  }

  async function onSubmit(values: FormValues, intent: "draft" | "investigate") {
    setServerError(null);
    try {
      const capa = await create.mutateAsync({
        title: values.title.trim(),
        source: values.source,
        description: values.description.trim(),
        eventDate: values.eventDate ? new Date(values.eventDate).toISOString() : null,
        dueDate: values.dueDate ? `${values.dueDate}T00:00:00Z` : null,
        priority: values.priority,
        aboutType: values.aboutType,
        aboutReference: clean(values.aboutReference),
        aboutDetails: buildAboutDetails(values),
        partyType: values.partyType,
        partyFirstName: clean(values.partyFirstName),
        partyLastName: clean(values.partyLastName),
        partyJobTitle: clean(values.partyJobTitle),
        partyCompany: clean(values.partyCompany),
        partyEmail: clean(values.partyEmail),
        partyPhone: clean(values.partyPhone),
        containmentDetails: clean(values.containmentDetails),
        documentReferences: buildDocumentReferences(selectedDocuments, externalFiles),
        keywords: keywords.length > 0 ? keywords.join(", ") : null,
        rootCause: buildRootCausePayload(values),
        correctiveActionPlan: buildCorrectiveActionPayload(values, allUsers, correctiveSelectedIds, correctiveFiles),
        preventiveActionPlan: buildPreventiveActionPayload(values, allUsers, preventiveSelectedIds, preventiveFiles),
        assignedTo: values.assignedTo ? Number(values.assignedTo) : null,
        assignmentStatus: values.assignmentStatus,
        assignmentComment: clean(values.assignmentComment),
        effectivenessCheckRequired: !!values.effectivenessCheckRequired,
      });
      if (intent === "investigate") {
        await transition.mutateAsync({
          id: capa.id,
          action: "submit-for-investigation",
          expectedVersion: capa.version,
          reason: "Submitted for investigation",
        });
      }
      toast.success("CAPA created");
      router.push(`/capa/${capa.id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setServerError(ax.response?.data?.message ?? "Could not save the CAPA. Please try again.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/capa">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Link>
        </Button>
        <ToolbarButton active>
          <FilePlus2 className="h-4 w-4" />
          New CAPA
        </ToolbarButton>
        <ToolbarLink href="/capa?action=action-required">
          <Timer className="h-4 w-4" />
          Action Required
        </ToolbarLink>
        <ToolbarLink href="/capa?action=mine">
          <Archive className="h-4 w-4" />
          My CAPAs
        </ToolbarLink>
        <ToolbarLink href="/capa?action=all">
          <ClipboardList className="h-4 w-4" />
          All CAPAs
        </ToolbarLink>
        <ToolbarLink href="/capa">
          <Settings className="h-4 w-4" />
          Set-Up
        </ToolbarLink>
        <ToolbarLink href="/capa">
          <Search className="h-4 w-4" />
          Search
        </ToolbarLink>
        <ToolbarLink href="/capa">
          <Wrench className="h-4 w-4" />
          All RCs
        </ToolbarLink>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-h1 text-brand-primary">New CAPA</h1>
          <p className="mt-1 text-body text-muted-foreground">Detailed intake for corrective and preventive action records.</p>
        </div>
        <Button asChild variant="ghost" size="sm" className="ml-auto">
          <Link href="/capa">Cancel</Link>
        </Button>
      </div>

      <form className="space-y-4" noValidate>
        {serverError && <ErrorAlert title="Couldn't save" message={serverError} />}

        <Card className="overflow-hidden border-t-4 border-t-brand-primary">
          <CardHeader className="border-b border-border bg-brand-light/30">
            <CardTitle>CAPA Intake</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <FieldBlock label="Date / time" htmlFor="eventDate" error={errors.eventDate?.message}>
                <Input id="eventDate" type="datetime-local" {...register("eventDate")} />
              </FieldBlock>
              <FieldBlock label="Number" htmlFor="capaNumber">
                <Input id="capaNumber" value="Generated on save" readOnly className="bg-muted/30 text-muted-foreground" />
              </FieldBlock>
            </div>

            <FieldBlock label="Title *" htmlFor="title" error={errors.title?.message}>
              <Input id="title" aria-invalid={!!errors.title} {...register("title")} />
            </FieldBlock>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
              <FieldBlock label="Source *" htmlFor="source">
                <Select id="source" {...register("source")}>
                  {SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {CAPA_SOURCE_LABELS[source]}
                    </option>
                  ))}
                </Select>
              </FieldBlock>
              <FieldBlock label="Due date" htmlFor="dueDate">
                <Input id="dueDate" type="date" {...register("dueDate")} />
              </FieldBlock>
              <FieldBlock label="Priority" htmlFor="priority">
                <Select id="priority" {...register("priority")}>
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {CAPA_PRIORITY_LABELS[priority]}
                    </option>
                  ))}
                </Select>
              </FieldBlock>
              <div className="rounded-lg border border-brand-primary/20 bg-brand-light/20 px-4 py-3">
                <label className="flex h-full items-center gap-3 text-body font-medium">
                  <input type="checkbox" className="h-4 w-4 rounded border-border" {...register("effectivenessCheckRequired")} />
                  Effectiveness check required
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-t-4 border-t-slate-400">
          <CardHeader className="border-b border-border bg-slate-100">
            <CardTitle>Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-4 rounded-lg border border-brand-primary/20 bg-brand-light/15 p-4">
              <div className="flex flex-wrap items-center gap-3 border-b border-brand-primary/15 pb-3">
                <h2 className="text-h3 text-foreground">About</h2>
                <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => setShowAboutDetails((value) => !value)}>
                  {showAboutDetails ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {showAboutDetails ? "Hide details" : "Add details"}
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[220px_1fr]">
                <FieldBlock label="About type" htmlFor="aboutType">
                  <Select id="aboutType" {...register("aboutType")}>
                    {ABOUT_TYPES.map((option) => (
                      <option key={option} value={option}>
                        {toLabel(option)}
                      </option>
                    ))}
                  </Select>
                </FieldBlock>
                <FieldBlock label="Reference" htmlFor="aboutReference">
                  <Input id="aboutReference" placeholder="Product, process, lot, equipment, or reference number" {...register("aboutReference")} />
                </FieldBlock>
              </div>
              {showAboutDetails && (
                <div className="grid grid-cols-1 gap-4 rounded-lg border border-brand-primary/15 bg-background p-4 lg:grid-cols-2">
                  <FieldBlock label="Item / record" htmlFor="aboutItemName">
                    <Input id="aboutItemName" {...register("aboutItemName")} />
                  </FieldBlock>
                  <FieldBlock label="Category / format" htmlFor="aboutCategory">
                    <Input id="aboutCategory" {...register("aboutCategory")} />
                  </FieldBlock>
                  <FieldBlock label="Supplier / owner" htmlFor="aboutSupplier">
                    <Input id="aboutSupplier" {...register("aboutSupplier")} />
                  </FieldBlock>
                  <FieldBlock label="Serial / batch / identifier" htmlFor="aboutIdentifier">
                    <Input id="aboutIdentifier" {...register("aboutIdentifier")} />
                  </FieldBlock>
                  <div className="lg:col-span-2">
                    <FieldBlock label="Additional notes" htmlFor="aboutNotes">
                      {richEditor("aboutNotes", 130)}
                    </FieldBlock>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-lg border border-success/25 bg-success/10 p-4">
              <div className="flex flex-wrap items-center gap-3 border-b border-success/20 pb-3">
                <h2 className="text-h3 text-foreground">Parties</h2>
                <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => setShowPartyDetails((value) => !value)}>
                  {showPartyDetails ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {showPartyDetails ? "Hide details" : "Add details"}
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[220px_1fr]">
                <FieldBlock label="Party type" htmlFor="partyType">
                  <Select id="partyType" {...register("partyType")}>
                    {PARTY_TYPES.map((option) => (
                      <option key={option} value={option}>
                        {toLabel(option)}
                      </option>
                    ))}
                  </Select>
                </FieldBlock>
                <FieldBlock label="Company / organization" htmlFor="partyCompany">
                  <Input id="partyCompany" {...register("partyCompany")} />
                </FieldBlock>
              </div>
              {showPartyDetails && (
                <div className="grid grid-cols-1 gap-4 rounded-lg border border-success/20 bg-background p-4 lg:grid-cols-2">
                  <FieldBlock label="First name" htmlFor="partyFirstName">
                    <Input id="partyFirstName" {...register("partyFirstName")} />
                  </FieldBlock>
                  <FieldBlock label="Last name" htmlFor="partyLastName">
                    <Input id="partyLastName" {...register("partyLastName")} />
                  </FieldBlock>
                  <FieldBlock label="Job title" htmlFor="partyJobTitle">
                    <Input id="partyJobTitle" {...register("partyJobTitle")} />
                  </FieldBlock>
                  <FieldBlock label="Telephone" htmlFor="partyPhone">
                    <Input id="partyPhone" {...register("partyPhone")} />
                  </FieldBlock>
                  <div className="lg:col-span-2">
                    <FieldBlock label="Email" htmlFor="partyEmail" error={errors.partyEmail?.message}>
                      <Input id="partyEmail" type="email" aria-invalid={!!errors.partyEmail} {...register("partyEmail")} />
                    </FieldBlock>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-t-4 border-t-slate-500">
          <CardHeader className="border-b border-border bg-slate-100">
            <CardTitle>Problem Description</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldBlock label="Problem description *" htmlFor="description" error={errors.description?.message}>
              {richEditor("description", 210, !!errors.description)}
            </FieldBlock>
          </CardContent>
        </Card>

        <ExpandableSection
          title="Containment"
          icon={<UserRound className="h-4 w-4" />}
          tone="amber"
          expanded={expanded.containment}
          onToggle={() => toggleSection("containment")}
        >
          <FieldBlock label="Containment details" htmlFor="containmentDetails">
            {richEditor("containmentDetails", 190)}
          </FieldBlock>
        </ExpandableSection>

        <ExpandableSection
          title="Documents"
          icon={<Paperclip className="h-4 w-4" />}
          tone="blue"
          expanded={expanded.documents}
          onToggle={() => toggleSection("documents")}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto]">
              <FieldBlock label="Search internal documents" htmlFor="documentSearch">
                <Input
                  id="documentSearch"
                  value={documentSearch}
                  onChange={(event) => setDocumentSearch(event.target.value)}
                  placeholder="Search by number or title"
                />
              </FieldBlock>
              <FieldBlock label="External files" htmlFor="externalFiles">
                <Input
                  id="externalFiles"
                  type="file"
                  multiple
                  onChange={(event) =>
                    setExternalFiles(Array.from(event.target.files ?? []).map((file) => file.name))
                  }
                  className="max-w-full"
                />
              </FieldBlock>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <DocumentPanel
                title="Available"
                items={availableDocuments.map((document) => ({
                  id: document.id,
                  label: `${document.documentNumber} - ${document.title}`,
                }))}
                emptyLabel={documentsQuery.isLoading ? "Loading documents..." : "No matching documents"}
                onSelect={(id) => setSelectedDocumentIds((current) => [...current, id])}
              />
              <DocumentPanel
                title="Selected"
                items={selectedDocuments.map((document) => ({
                  id: document.id,
                  label: `${document.documentNumber} - ${document.title}`,
                }))}
                emptyLabel="No documents selected"
                onSelect={(id) => setSelectedDocumentIds((current) => current.filter((value) => value !== id))}
                removeMode
              />
            </div>

            {externalFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {externalFiles.map((file) => (
                  <Badge key={file} variant="neutral">
                    {file}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </ExpandableSection>

        <ExpandableSection
          title="Keywords"
          icon={<Tags className="h-4 w-4" />}
          tone="green"
          expanded={expanded.keywords}
          onToggle={() => toggleSection("keywords")}
        >
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addKeyword();
                  }
                }}
                placeholder="Add searchable keywords"
              />
              <Button type="button" variant="outline" onClick={addKeyword}>
                Add keyword
              </Button>
            </div>
            <div className="flex min-h-12 flex-wrap gap-2 rounded-lg border border-dashed border-success/30 bg-success/10 p-3">
              {keywords.length === 0 ? (
                <span className="text-label text-muted-foreground">No keywords added yet.</span>
              ) : (
                keywords.map((keyword) => (
                  <Badge key={keyword} variant="info" className="gap-2">
                    {keyword}
                    <button type="button" aria-label={`Remove ${keyword}`} onClick={() => setKeywords((current) => current.filter((value) => value !== keyword))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>
        </ExpandableSection>

        <Card className="overflow-hidden border-t-4 border-t-brand-primary">
          <div className="grid grid-cols-1 gap-px bg-border xl:grid-cols-3">
            <ActionStageButton
              active={activeActionPanel === "root"}
              tone="amber"
              icon={<Search className="h-5 w-5" />}
              title="Root Cause"
              onClick={() => setActiveActionPanel("root")}
            />
            <ActionStageButton
              active={activeActionPanel === "corrective"}
              tone="blue"
              icon={<Wrench className="h-5 w-5" />}
              title="Corrective Action"
              onClick={() => setActiveActionPanel("corrective")}
            />
            <ActionStageButton
              active={activeActionPanel === "preventive"}
              tone="green"
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Preventive Action"
              onClick={() => setActiveActionPanel("preventive")}
            />
          </div>
          <CardContent className={cn("space-y-5 border-t pt-5", actionPanelSurface(activeActionPanel))}>
            {activeActionPanel === "root" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 lg:max-w-xl">
                  <FieldBlock label="Analysis method" htmlFor="rootCauseMethod">
                    <Select id="rootCauseMethod" {...register("rootCauseMethod")}>
                      {ROOT_CAUSE_METHODS.map((method) => (
                        <option key={method || "blank"} value={method}>
                          {method ? toLabel(method) : "Select"}
                        </option>
                      ))}
                    </Select>
                  </FieldBlock>
                </div>
                <FieldBlock label="Root cause analysis" htmlFor="rootCause">
                  {richEditor("rootCause", 230)}
                </FieldBlock>
              </div>
            ) : null}

            {activeActionPanel === "corrective" ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <FieldBlock label="Implementation target date" htmlFor="correctiveImplementationTargetDate">
                    <Input id="correctiveImplementationTargetDate" type="date" {...register("correctiveImplementationTargetDate")} />
                  </FieldBlock>
                  <FieldBlock label="Effectiveness target date" htmlFor="correctiveEffectivenessTargetDate">
                    <Input id="correctiveEffectivenessTargetDate" type="date" {...register("correctiveEffectivenessTargetDate")} />
                  </FieldBlock>
                </div>

                <ActionDetailSection
                  title="Action Required"
                  tone="blue"
                  expanded={correctiveSections.required}
                  onToggle={() => setCorrectiveSections((current) => ({ ...current, required: !current.required }))}
                >
                  <div className="space-y-4">
                    <FieldBlock label="Responsibility" htmlFor="correctiveResponsibilityType">
                      <Select id="correctiveResponsibilityType" {...register("correctiveResponsibilityType")}>
                        <option value="">Select</option>
                        {RESPONSIBILITY_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {toLabel(option)}
                          </option>
                        ))}
                      </Select>
                    </FieldBlock>
                    <AssigneeTransfer
                      searchLabel="Assign responsibility"
                      searchValue={correctiveSearch}
                      onSearchChange={setCorrectiveSearch}
                      selectedFilterValue={correctiveSelectedFilter}
                      onSelectedFilterChange={setCorrectiveSelectedFilter}
                      availableUsers={correctiveAvailableUsers}
                      selectedUsers={correctiveSelectedUsers}
                      onAdd={(id) => setCorrectiveSelectedIds((current) => addUniqueId(current, id))}
                      onRemove={(id) => setCorrectiveSelectedIds((current) => current.filter((value) => value !== id))}
                    />
                    <FieldBlock label="Action required" htmlFor="correctiveActionRequired">
                      {richEditor("correctiveActionRequired", 210)}
                    </FieldBlock>
                  </div>
                </ActionDetailSection>

                <ActionDetailSection
                  title="Action Taken"
                  tone="blue"
                  expanded={correctiveSections.taken}
                  onToggle={() => setCorrectiveSections((current) => ({ ...current, taken: !current.taken }))}
                >
                  <div className="space-y-4">
                    <FieldBlock label="Action taken" htmlFor="correctiveActionTaken">
                      {richEditor("correctiveActionTaken", 190)}
                    </FieldBlock>
                    <FieldBlock label="Documents" htmlFor="correctiveFiles">
                      <Input
                        id="correctiveFiles"
                        type="file"
                        multiple
                        onChange={(event) => setCorrectiveFiles(Array.from(event.target.files ?? []).map((file) => file.name))}
                      />
                    </FieldBlock>
                    {correctiveFiles.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {correctiveFiles.map((file) => (
                          <Badge key={file} variant="neutral">
                            {file}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </ActionDetailSection>

                <ActionDetailSection
                  title="Effectiveness"
                  tone="blue"
                  expanded={correctiveSections.effectiveness}
                  onToggle={() => setCorrectiveSections((current) => ({ ...current, effectiveness: !current.effectiveness }))}
                >
                  <div className="space-y-4">
                    <FieldBlock label="Effectiveness" htmlFor="correctiveEffectiveness">
                      {richEditor("correctiveEffectiveness", 170)}
                    </FieldBlock>
                    <label className="flex items-center gap-3 text-body font-medium">
                      <input type="checkbox" className="h-4 w-4 rounded border-border" {...register("correctiveNotificationRequired")} />
                      Send a corrective action notification requiring a response
                    </label>
                  </div>
                </ActionDetailSection>
              </div>
            ) : null}

            {activeActionPanel === "preventive" ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <FieldBlock label="Implementation target date" htmlFor="preventiveImplementationTargetDate">
                    <Input id="preventiveImplementationTargetDate" type="date" {...register("preventiveImplementationTargetDate")} />
                  </FieldBlock>
                  <FieldBlock label="Effectiveness target date" htmlFor="preventiveEffectivenessTargetDate">
                    <Input id="preventiveEffectivenessTargetDate" type="date" {...register("preventiveEffectivenessTargetDate")} />
                  </FieldBlock>
                </div>

                <ActionDetailSection
                  title="Action Required"
                  tone="green"
                  expanded={preventiveSections.required}
                  onToggle={() => setPreventiveSections((current) => ({ ...current, required: !current.required }))}
                >
                  <div className="space-y-4">
                    <FieldBlock label="Responsibility" htmlFor="preventiveResponsibilityType">
                      <Select id="preventiveResponsibilityType" {...register("preventiveResponsibilityType")}>
                        <option value="">Select</option>
                        {RESPONSIBILITY_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {toLabel(option)}
                          </option>
                        ))}
                      </Select>
                    </FieldBlock>
                    <AssigneeTransfer
                      searchLabel="Assign responsibility"
                      searchValue={preventiveSearch}
                      onSearchChange={setPreventiveSearch}
                      selectedFilterValue={preventiveSelectedFilter}
                      onSelectedFilterChange={setPreventiveSelectedFilter}
                      availableUsers={preventiveAvailableUsers}
                      selectedUsers={preventiveSelectedUsers}
                      onAdd={(id) => setPreventiveSelectedIds((current) => addUniqueId(current, id))}
                      onRemove={(id) => setPreventiveSelectedIds((current) => current.filter((value) => value !== id))}
                    />
                    <FieldBlock label="Action required" htmlFor="preventiveActionRequired">
                      {richEditor("preventiveActionRequired", 210)}
                    </FieldBlock>
                  </div>
                </ActionDetailSection>

                <ActionDetailSection
                  title="Action Taken"
                  tone="green"
                  expanded={preventiveSections.taken}
                  onToggle={() => setPreventiveSections((current) => ({ ...current, taken: !current.taken }))}
                >
                  <div className="space-y-4">
                    <FieldBlock label="Action taken" htmlFor="preventiveActionTaken">
                      {richEditor("preventiveActionTaken", 190)}
                    </FieldBlock>
                    <FieldBlock label="Documents" htmlFor="preventiveFiles">
                      <Input
                        id="preventiveFiles"
                        type="file"
                        multiple
                        onChange={(event) => setPreventiveFiles(Array.from(event.target.files ?? []).map((file) => file.name))}
                      />
                    </FieldBlock>
                    {preventiveFiles.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {preventiveFiles.map((file) => (
                          <Badge key={file} variant="neutral">
                            {file}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </ActionDetailSection>

                <ActionDetailSection
                  title="Effectiveness"
                  tone="green"
                  expanded={preventiveSections.effectiveness}
                  onToggle={() => setPreventiveSections((current) => ({ ...current, effectiveness: !current.effectiveness }))}
                >
                  <div className="space-y-4">
                    <FieldBlock label="Effectiveness" htmlFor="preventiveEffectiveness">
                      {richEditor("preventiveEffectiveness", 170)}
                    </FieldBlock>
                    <label className="flex items-center gap-3 text-body font-medium">
                      <input type="checkbox" className="h-4 w-4 rounded border-border" {...register("preventiveNotificationRequired")} />
                      Send a preventive action notification requiring a response
                    </label>
                  </div>
                </ActionDetailSection>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-t-4 border-t-brand-primary">
          <CardHeader className="border-b border-border bg-brand-light/30">
            <CardTitle>Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <FieldBlock label="Assignment status" htmlFor="assignmentStatus">
                <Select id="assignmentStatus" {...register("assignmentStatus")}>
                  {ASSIGNMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {toLabel(status)}
                    </option>
                  ))}
                </Select>
              </FieldBlock>
              <FieldBlock label="Assign to" htmlFor="assignedTo">
                <Select id="assignedTo" {...register("assignedTo")}>
                  <option value="">Select owner</option>
                  {usersQuery.data?.map((user) => (
                    <option key={user.id} value={String(user.id)}>
                      {user.fullName}
                    </option>
                  ))}
                </Select>
              </FieldBlock>
            </div>
            <FieldBlock label="Comment" htmlFor="assignmentComment">
              {richEditor("assignmentComment", 170)}
            </FieldBlock>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2 border-t border-border pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={resetExtras} disabled={busy}>
            Clear
          </Button>
          <Button type="button" variant="outline" disabled={busy} onClick={handleSubmit((values) => onSubmit(values, "draft"))}>
            Save as Draft
          </Button>
          <Button type="button" disabled={busy} onClick={handleSubmit((values) => onSubmit(values, "investigate"))}>
            {busy ? "Saving..." : "Submit for Investigation"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function ToolbarLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={href}>{children}</Link>
    </Button>
  );
}

function ToolbarButton({ active, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      className={cn(active && "bg-brand-primary text-white hover:bg-brand-primary/90", className)}
      {...props}
    />
  );
}

function FieldBlock({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-label text-error">{error}</p> : null}
    </div>
  );
}

type SectionTone = "amber" | "blue" | "green" | "slate";

function sectionToneClasses(tone: SectionTone) {
  switch (tone) {
    case "amber":
      return {
        card: "border-amber-400/70",
        header: "border-amber-300/60 bg-amber-50",
        body: "bg-amber-50/40",
        icon: "text-amber-600",
      };
    case "green":
      return {
        card: "border-success/60",
        header: "border-success/25 bg-success/10",
        body: "bg-success/5",
        icon: "text-success",
      };
    case "slate":
      return {
        card: "border-slate-400/70",
        header: "border-slate-200 bg-slate-100",
        body: "bg-slate-50",
        icon: "text-slate-600",
      };
    case "blue":
    default:
      return {
        card: "border-brand-primary/60",
        header: "border-brand-primary/20 bg-brand-light/30",
        body: "bg-brand-light/10",
        icon: "text-brand-primary",
      };
  }
}

function actionStageToneClasses(tone: SectionTone, active: boolean) {
  if (tone === "amber") {
    return {
      container: active
        ? "border-amber-500 bg-amber-50 text-amber-950"
        : "border-transparent bg-slate-100 text-slate-700 hover:bg-amber-50/70",
      icon: active ? "text-amber-600" : "text-slate-500",
    };
  }
  if (tone === "green") {
    return {
      container: active
        ? "border-success bg-success/10 text-slate-950"
        : "border-transparent bg-slate-100 text-slate-700 hover:bg-success/10",
      icon: active ? "text-success" : "text-slate-500",
    };
  }
  return {
    container: active
      ? "border-brand-primary bg-brand-light/35 text-brand-primary"
      : "border-transparent bg-slate-100 text-slate-700 hover:bg-brand-light/20",
    icon: active ? "text-brand-primary" : "text-slate-500",
  };
}

function actionPanelSurface(panel: "root" | "corrective" | "preventive") {
  if (panel === "root") return "border-amber-200 bg-amber-50/35";
  if (panel === "preventive") return "border-success/20 bg-success/5";
  return "border-brand-primary/20 bg-brand-light/10";
}

function ExpandableSection({
  title,
  icon,
  tone = "blue",
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: ReactNode;
  tone?: SectionTone;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const style = sectionToneClasses(tone);
  return (
    <Card className={cn("overflow-hidden border-l-4", style.card)}>
      <button
        type="button"
        className={cn("flex w-full items-center gap-3 border-b px-5 py-4 text-left", style.header)}
        onClick={onToggle}
      >
        <span className={style.icon}>{icon}</span>
        <span className="text-h3 text-foreground">{title}</span>
        <span className="ml-auto text-muted-foreground">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
      </button>
      {expanded ? <CardContent className={cn("pt-5", style.body)}>{children}</CardContent> : null}
    </Card>
  );
}

function ActionStageButton({
  active,
  tone,
  icon,
  title,
  onClick,
}: {
  active: boolean;
  tone: SectionTone;
  icon: ReactNode;
  title: string;
  onClick: () => void;
}) {
  const style = actionStageToneClasses(tone, active);
  return (
    <button
      type="button"
      className={cn(
        "flex min-h-28 items-center gap-4 border-t-4 px-5 py-5 text-left transition-colors",
        style.container
      )}
      onClick={onClick}
    >
      <span className={cn("shrink-0", style.icon)}>{icon}</span>
      <span className="text-h3">{title}</span>
    </button>
  );
}

function ActionDetailSection({
  title,
  tone = "blue",
  expanded,
  onToggle,
  children,
}: {
  title: string;
  tone?: SectionTone;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const style = sectionToneClasses(tone);
  return (
    <div className={cn("overflow-hidden rounded-lg border", style.card)}>
      <button
        type="button"
        className={cn("flex w-full items-center gap-3 border-b px-4 py-3 text-left", style.header)}
        onClick={onToggle}
      >
        <span className="text-body font-semibold text-foreground">{title}</span>
        <span className={cn("ml-auto inline-flex h-6 w-6 items-center justify-center rounded-full border", style.icon)}>
          {expanded ? <Minus className="h-4 w-4" /> : <FilePlus2 className="h-4 w-4" />}
        </span>
      </button>
      {expanded ? <div className={cn("space-y-4 p-4", style.body)}>{children}</div> : null}
    </div>
  );
}

function AssigneeTransfer({
  searchLabel,
  searchValue,
  onSearchChange,
  selectedFilterValue,
  onSelectedFilterChange,
  availableUsers,
  selectedUsers,
  onAdd,
  onRemove,
}: {
  searchLabel: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedFilterValue: string;
  onSelectedFilterChange: (value: string) => void;
  availableUsers: { id: number; fullName: string; email?: string }[];
  selectedUsers: { id: number; fullName: string; email?: string }[];
  onAdd: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  return (
    <div className="space-y-3">
      <FieldBlock label={searchLabel} htmlFor={`${searchLabel}-available`}>
        <Input
          id={`${searchLabel}-available`}
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search here..."
        />
      </FieldBlock>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <TransferList
          title={availableUsers.length === 0 ? "Empty list" : "Available"}
          filterValue={searchValue}
          onFilterChange={onSearchChange}
          items={availableUsers}
          actionLabel="Add"
          onItemAction={onAdd}
        />
        <TransferList
          title={selectedUsers.length === 0 ? "Empty list" : "Selected"}
          filterValue={selectedFilterValue}
          onFilterChange={onSelectedFilterChange}
          items={selectedUsers}
          actionLabel="Remove"
          onItemAction={onRemove}
        />
      </div>
    </div>
  );
}

function TransferList({
  title,
  filterValue,
  onFilterChange,
  items,
  actionLabel,
  onItemAction,
}: {
  title: string;
  filterValue: string;
  onFilterChange: (value: string) => void;
  items: { id: number; fullName: string; email?: string }[];
  actionLabel: string;
  onItemAction: (id: number) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="border-b border-border px-4 py-3">
        <h4 className="text-body font-semibold">{title}</h4>
      </div>
      <div className="space-y-3 p-3">
        <Input value={filterValue} onChange={(event) => onFilterChange(event.target.value)} placeholder="Filter" />
        <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-border p-2">
          {items.length === 0 ? (
            <p className="px-2 py-6 text-center text-label text-muted-foreground">No matches</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-left hover:bg-accent/35"
                onClick={() => onItemAction(item.id)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-body">{item.fullName}</span>
                  <span className="block truncate text-label text-muted-foreground">{item.email || `User #${item.id}`}</span>
                </span>
                <span className="shrink-0 text-label font-semibold text-brand-primary">{actionLabel}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function DocumentPanel({
  title,
  items,
  emptyLabel,
  onSelect,
  removeMode = false,
}: {
  title: string;
  items: { id: number; label: string }[];
  emptyLabel: string;
  onSelect: (id: number) => void;
  removeMode?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-body font-semibold">{title}</h3>
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto p-3">
        {items.length === 0 ? (
          <p className="text-label text-muted-foreground">{emptyLabel}</p>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="flex w-full items-start justify-between gap-3 rounded-md border border-border px-3 py-2 text-left hover:bg-accent/35"
              onClick={() => onSelect(item.id)}
            >
              <span className="text-body">{item.label}</span>
              <span className="text-label font-semibold text-brand-primary">{removeMode ? "Remove" : "Add"}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function buildAboutDetails(values: FormValues) {
  const lines = [
    pair("Item / record", values.aboutItemName),
    pair("Category / format", values.aboutCategory),
    pair("Supplier / owner", values.aboutSupplier),
    pair("Identifier", values.aboutIdentifier),
    pair("Additional notes", values.aboutNotes),
  ].filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : null;
}

function buildDocumentReferences(
  selectedDocuments: { documentNumber: string; title: string }[],
  externalFiles: string[]
) {
  const lines = [
    ...selectedDocuments.map((document) => `Internal: ${document.documentNumber} - ${document.title}`),
    ...externalFiles.map((file) => `External: ${file}`),
  ];
  return lines.length > 0 ? lines.join("\n") : null;
}

function buildRootCausePayload(values: FormValues) {
  const lines = [
    pair("Analysis Method", values.rootCauseMethod ? toLabel(values.rootCauseMethod) : undefined),
    clean(values.rootCause),
  ].filter(Boolean);
  return lines.length > 0 ? lines.join("\n\n") : null;
}

function buildCorrectiveActionPayload(
  values: FormValues,
  users: { id: number; fullName: string }[],
  selectedIds: number[],
  files: string[]
) {
  return buildActionPlanPayload("Corrective", {
    implementationTargetDate: values.correctiveImplementationTargetDate,
    effectivenessTargetDate: values.correctiveEffectivenessTargetDate,
    responsibilityType: values.correctiveResponsibilityType,
    assignees: namesForUsers(users, selectedIds),
    actionRequired: values.correctiveActionRequired,
    actionTaken: values.correctiveActionTaken,
    effectiveness: values.correctiveEffectiveness,
    files,
    notificationRequired: values.correctiveNotificationRequired,
    freeform: values.correctiveActionPlan,
  });
}

function buildPreventiveActionPayload(
  values: FormValues,
  users: { id: number; fullName: string }[],
  selectedIds: number[],
  files: string[]
) {
  return buildActionPlanPayload("Preventive", {
    implementationTargetDate: values.preventiveImplementationTargetDate,
    effectivenessTargetDate: values.preventiveEffectivenessTargetDate,
    responsibilityType: values.preventiveResponsibilityType,
    assignees: namesForUsers(users, selectedIds),
    actionRequired: values.preventiveActionRequired,
    actionTaken: values.preventiveActionTaken,
    effectiveness: values.preventiveEffectiveness,
    files,
    notificationRequired: values.preventiveNotificationRequired,
    freeform: values.preventiveActionPlan,
  });
}

function buildActionPlanPayload(
  label: "Corrective" | "Preventive",
  details: {
    implementationTargetDate?: string;
    effectivenessTargetDate?: string;
    responsibilityType?: string;
    assignees: string[];
    actionRequired?: string;
    actionTaken?: string;
    effectiveness?: string;
    files: string[];
    notificationRequired?: boolean;
    freeform?: string;
  }
) {
  const lines = [
    pair("Section", `${label} Action`),
    pair("Implementation Target Date", details.implementationTargetDate),
    pair("Effectiveness Target Date", details.effectivenessTargetDate),
    pair("Responsibility", details.responsibilityType ? toLabel(details.responsibilityType) : undefined),
    pair("Assigned To", details.assignees.length > 0 ? details.assignees.join(", ") : undefined),
    pair("Action Required", details.actionRequired),
    pair("Action Taken", details.actionTaken),
    pair("Effectiveness", details.effectiveness),
    pair("Documents", details.files.length > 0 ? details.files.join(", ") : undefined),
    pair("Notification Required", details.notificationRequired ? "Yes" : undefined),
    pair("Additional Notes", details.freeform),
  ].filter(Boolean);
  return lines.length > 0 ? lines.join("\n\n") : null;
}

function namesForUsers(users: { id: number; fullName: string }[], selectedIds: number[]) {
  return selectedIds
    .map((id) => users.find((user) => user.id === id)?.fullName)
    .filter((value): value is string => Boolean(value));
}

function filterAssignableUsers(
  users: { id: number; fullName: string; email?: string }[],
  selectedIds: number[],
  query: string
) {
  const normalized = query.trim().toLowerCase();
  return users.filter((user) => {
    if (selectedIds.includes(user.id)) return false;
    if (!normalized) return true;
    return `${user.fullName} ${user.email ?? ""}`.toLowerCase().includes(normalized);
  });
}

function filterChosenUsers(
  users: { id: number; fullName: string; email?: string }[],
  selectedIds: number[],
  query: string
) {
  const normalized = query.trim().toLowerCase();
  return users.filter((user) => {
    if (!selectedIds.includes(user.id)) return false;
    if (!normalized) return true;
    return `${user.fullName} ${user.email ?? ""}`.toLowerCase().includes(normalized);
  });
}

function addUniqueId(current: number[], id: number) {
  return current.includes(id) ? current : [...current, id];
}

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function pair(label: string, value?: string) {
  const cleaned = clean(value);
  return cleaned ? `${label}: ${cleaned}` : null;
}

function toLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function toDateTimeLocal(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}
