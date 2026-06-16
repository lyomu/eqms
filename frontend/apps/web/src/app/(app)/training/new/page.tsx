"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  GraduationCap,
  Plus,
  Search,
  Settings,
  Timer,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select } from "@/components/ui/select";
import { useUsers } from "@/hooks/useDocuments";
import { useCreateTraining } from "@/hooks/useTraining";
import { cn } from "@/lib/utils";
import { AUDIENCE_LABELS, FREQUENCY_LABELS, type TrainingAudience, type TrainingFrequency } from "@/types/training";

type Occurrence = "Once" | "Recurring" | "Multiple";
type ReleaseMode = "Immediate" | "Scheduled" | "After Approval";

const TRAINING_TYPES = ["Document Training", "Classroom", "Practical", "Assessment", "SOP Review"];
const DOCUMENTS = [
  "ISO Customer Support Process v1.2 2022-08-10 [1.02]",
  "isoTracker access permissions v1.0 2023-10-09 [1.00]",
  "ISO Change Control Process v1.3 2023-07-12 [1.00]",
  "ISO Password Policy v1.0 2023-10-09 [1.00]",
  "ISO System Structure and Access Security v2.1 2023-10-09 [2.01]",
  "Packaging Line Clearance SOP v3.0 2026-04-12 [3.00]",
];

export default function NewTrainingPage() {
  const router = useRouter();
  const create = useCreateTraining();
  const users = useUsers();
  const [error, setError] = useState<string | null>(null);
  const [numbering, setNumbering] = useState("Training");
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState<TrainingAudience>("ALL");
  const [occurrence, setOccurrence] = useState<Occurrence>("Once");
  const [frequency, setFrequency] = useState<TrainingFrequency>("ANNUAL");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [releaseMode, setReleaseMode] = useState<ReleaseMode>("Immediate");
  const [releaseDate, setReleaseDate] = useState("");
  const [mainTrainer, setMainTrainer] = useState("");
  const [sessions, setSessions] = useState([{ start: "", end: "" }, { start: "", end: "" }]);
  const [availableTrainers, setAvailableTrainers] = useState<string[]>([]);
  const [selectedTrainers, setSelectedTrainers] = useState<string[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState(DOCUMENTS);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [objectives, setObjectives] = useState("");
  const [assessment, setAssessment] = useState("");

  const trainerNames = useMemo(() => users.data?.map((user) => user.fullName) ?? [], [users.data]);
  const additionalTrainerPool = (availableTrainers.length > 0 ? availableTrainers : trainerNames)
    .filter((name) => name !== mainTrainer && !selectedTrainers.includes(name));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const training = await create.mutateAsync({
        title,
        content: buildTrainingContent({
          numbering,
          type,
          title,
          audience,
          occurrence,
          frequency,
          start,
          end,
          completionDate,
          releaseMode,
          releaseDate,
          mainTrainer,
          selectedTrainers,
          selectedDocuments,
          sessions,
          description,
          objectives,
          assessment,
        }),
        intendedAudience: audience,
        requiredFrequency: occurrence === "Once" ? "ON_HIRE" : frequency,
      });
      toast.success("Training program created");
      router.push(`/training/${training.id}`);
    } catch (err) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Could not create training.");
    }
  }

  function moveTrainer(name: string, toSelected: boolean) {
    if (toSelected) {
      setSelectedTrainers((current) => current.includes(name) ? current : [...current, name]);
      setAvailableTrainers((current) => current.filter((item) => item !== name));
    } else {
      setSelectedTrainers((current) => current.filter((item) => item !== name));
      setAvailableTrainers((current) => current.includes(name) ? current : [...current, name]);
    }
  }

  function moveDocument(name: string, toSelected: boolean) {
    if (toSelected) {
      setSelectedDocuments((current) => current.includes(name) ? current : [...current, name]);
      setAvailableDocuments((current) => current.filter((item) => item !== name));
    } else {
      setSelectedDocuments((current) => current.filter((item) => item !== name));
      setAvailableDocuments((current) => current.includes(name) ? current : [...current, name]);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/70 px-2 py-2">
        <ActionButton href="/training" icon={<ArrowLeft className="h-4 w-4" />} label="Go Back" />
        <ActionButton active icon={<GraduationCap className="h-4 w-4" />} label="New Training" />
        <ActionButton icon={<Timer className="h-4 w-4" />} label="Action Required" />
        <ActionButton href="/my-trainings" icon={<FileText className="h-4 w-4" />} label="My Training" />
        <ActionButton href="/training" icon={<FileText className="h-4 w-4" />} label="All Training" />
        <ActionButton icon={<Settings className="h-4 w-4" />} label="Set-Up" />
        <ActionButton icon={<CalendarDays className="h-4 w-4" />} label="Calendar" />
        <ActionButton icon={<Search className="h-4 w-4" />} label="Search" />
      </div>

      {error ? <ErrorAlert title="Couldn't create training" message={error} /> : null}

      <form onSubmit={submit} className="space-y-3 rounded-md bg-muted/40 p-3">
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border lg:grid-cols-2">
          <div className="bg-background p-3 text-center font-semibold">Create Training</div>
          <div className="bg-muted p-3 text-center font-semibold text-muted-foreground">Add Training</div>
        </div>

        <SectionShell>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <Field label="Number" required help>
              <Select value={numbering} onChange={(event) => setNumbering(event.target.value)}>
                <option value="Training">Training</option>
                <option value="Induction">Induction</option>
                <option value="Competency">Competency</option>
              </Select>
            </Field>
            <Field label="Type" required help>
              <Select value={type} onChange={(event) => setType(event.target.value)} required>
                <option value="">Select</option>
                {TRAINING_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
              </Select>
            </Field>
            <Field label="Audience" required help>
              <Select value={audience} onChange={(event) => setAudience(event.target.value as TrainingAudience)}>
                {Object.entries(AUDIENCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </Field>
            <Field label="Release Date" required help>
              <Select value={releaseMode} onChange={(event) => setReleaseMode(event.target.value as ReleaseMode)}>
                <option value="Immediate">Immediate</option>
                <option value="Scheduled">Scheduled</option>
                <option value="After Approval">After Approval</option>
              </Select>
            </Field>
          </div>
          {releaseMode === "Scheduled" ? (
            <div className="mt-4 max-w-md">
              <Field label="Scheduled Release Date" required help>
                <Input type="datetime-local" value={releaseDate} onChange={(event) => setReleaseDate(event.target.value)} required />
              </Field>
            </div>
          ) : null}
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="training-title">Title:<Required /></Label>
            <Input id="training-title" value={title} onChange={(event) => setTitle(event.target.value)} required className="border border-border bg-background" />
          </div>
        </SectionShell>

        <SectionShell>
          <div className={cn("grid grid-cols-1 gap-4", occurrence === "Recurring" ? "xl:grid-cols-3" : "xl:grid-cols-2")}>
            <Field label="Occurrence" required help>
              <Select value={occurrence} onChange={(event) => setOccurrence(event.target.value as Occurrence)}>
                <option value="Once">Once</option>
                <option value="Recurring">Recurring</option>
                <option value="Multiple">Multiple</option>
              </Select>
            </Field>

            {occurrence === "Once" ? (
              <>
                <Field label="Start" required help><Input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} required /></Field>
                <Field label="End" help><Input type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} /></Field>
              </>
            ) : null}

            {occurrence === "Recurring" ? (
              <>
                <Field label="Start" required help><Input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} required /></Field>
                <Field label="End" help><Input type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} /></Field>
                <Field label="Recurrence" required help>
                  <Select value={frequency} onChange={(event) => setFrequency(event.target.value as TrainingFrequency)}>
                    {Object.entries(FREQUENCY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </Select>
                </Field>
                <Field label="Completion Date" help><Input type="datetime-local" value={completionDate} onChange={(event) => setCompletionDate(event.target.value)} /></Field>
              </>
            ) : null}
          </div>

          {occurrence === "Multiple" ? (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {sessions.map((session, index) => (
                  <div key={index} className="grid grid-cols-1 gap-4 rounded-md border border-border bg-background p-3 md:grid-cols-2">
                    <Field label={`Start ${index + 1}`} required help>
                      <Input
                        type="datetime-local"
                        value={session.start}
                        onChange={(event) => setSessions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, start: event.target.value } : item))}
                        required={index === 0}
                      />
                    </Field>
                    <Field label={`End ${index + 1}`} help>
                      <Input
                        type="datetime-local"
                        value={session.end}
                        onChange={(event) => setSessions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, end: event.target.value } : item))}
                      />
                    </Field>
                    {sessions.length > 1 ? (
                      <button type="button" onClick={() => setSessions((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex items-center gap-1 text-label font-semibold text-error md:col-span-2">
                        <X className="h-4 w-4" /> Remove session
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setSessions((current) => [...current, { start: "", end: "" }])} className="inline-flex items-center gap-1 text-body font-semibold text-brand-secondary">
                <Plus className="h-4 w-4" /> Add Another Session
              </button>
            </div>
          ) : null}
        </SectionShell>

        <SectionShell>
          <div className="max-w-lg">
            <Field label="Main Trainers" required help>
              <Select value={mainTrainer} onChange={(event) => setMainTrainer(event.target.value)} required>
                <option value="">Select</option>
                {trainerNames.map((name) => <option key={name} value={name}>{name}</option>)}
              </Select>
            </Field>
          </div>
          <TransferPanel
            title="Search & Select Additional Trainers"
            availableTitle={`Showing all ${additionalTrainerPool.length}`}
            selectedTitle={selectedTrainers.length ? "Selected trainers" : "Empty list"}
            available={additionalTrainerPool}
            selected={selectedTrainers}
            onMove={moveTrainer}
          />
        </SectionShell>

        <SectionShell>
          <TransferPanel
            title="Search & Select Internal Documents"
            search
            availableTitle={`Showing all ${availableDocuments.length + selectedDocuments.length}`}
            selectedTitle={selectedDocuments.length ? "Selected documents" : "Empty list"}
            available={availableDocuments}
            selected={selectedDocuments}
            onMove={moveDocument}
          />
          <div className="mt-4">
            <Label>External Documents:</Label>
            <div><Button type="button" className="mt-2 bg-success text-white hover:bg-success/90">Click to Upload</Button></div>
          </div>
        </SectionShell>

        <SectionShell>
          <div className="space-y-2">
            <Label>Description:<Required /></Label>
            <RichTextEditor value={description} onChange={setDescription} minHeight={160} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="space-y-2">
              <Label>Learning Objectives:</Label>
              <RichTextEditor value={objectives} onChange={setObjectives} minHeight={140} />
            </div>
            <div className="space-y-2">
              <Label>Assessment / Completion Criteria:</Label>
              <RichTextEditor value={assessment} onChange={setAssessment} minHeight={140} />
            </div>
          </div>
        </SectionShell>

        <div className="flex justify-center gap-2 rounded-md bg-muted p-3">
          <Button type="submit" disabled={create.isPending} className="bg-success text-white hover:bg-success/90">{create.isPending ? "Submitting..." : "Submit"}</Button>
          <Button type="button" variant="outline" onClick={() => router.refresh()}>Clear</Button>
          <Button type="button" variant="outline" onClick={() => router.push("/training")}>Close</Button>
        </div>
      </form>
    </div>
  );
}

function ActionButton({ href, icon, label, active = false }: { href?: string; icon: React.ReactNode; label: string; active?: boolean }) {
  const className = cn("h-9 bg-background px-3 text-muted-foreground shadow-sm hover:bg-accent", active && "bg-success text-white hover:bg-success/90");
  const content = <>{icon}{label}</>;
  if (href) return <Button asChild size="sm" variant="outline" className={className}><Link href={href}>{content}</Link></Button>;
  return <Button size="sm" variant="outline" className={className}>{content}</Button>;
}

function SectionShell({ children }: { children: React.ReactNode }) {
  return <section className="rounded-md bg-muted/60 p-3">{children}</section>;
}

function Field({ label, required = false, help = false, children }: { label: string; required?: boolean; help?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}:{required ? <Required /> : null}
        {help ? <HelpDot /> : null}
      </Label>
      {children}
    </div>
  );
}

function Required() {
  return <span className="text-error">*</span>;
}

function HelpDot() {
  return <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-success text-xs font-bold text-white">?</span>;
}

function TransferPanel({
  title,
  availableTitle,
  selectedTitle,
  available,
  selected,
  search = false,
  onMove,
}: {
  title: string;
  availableTitle: string;
  selectedTitle: string;
  available: string[];
  selected: string[];
  search?: boolean;
  onMove: (name: string, toSelected: boolean) => void;
}) {
  const [availableFilter, setAvailableFilter] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("");
  const availableRows = available.filter((item) => item.toLowerCase().includes(availableFilter.toLowerCase()));
  const selectedRows = selected.filter((item) => item.toLowerCase().includes(selectedFilter.toLowerCase()));

  return (
    <div className="mt-4 space-y-2">
      <Label>{title}: <HelpDot /></Label>
      {search ? (
        <div className="flex max-w-5xl">
          <Input placeholder="Search here..." className="rounded-r-none border-border bg-background" />
          <Button type="button" variant="outline" className="rounded-l-none border-l-0"><Search className="h-4 w-4" /></Button>
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-body">{availableTitle}</p>
          <Input value={availableFilter} onChange={(event) => setAvailableFilter(event.target.value)} placeholder="Filter" className="mb-2 border-border bg-background" />
          <TransferList items={availableRows} empty="Empty list" onClick={(item) => onMove(item, true)} direction="right" />
        </div>
        <div>
          <p className="mb-2 text-body">{selectedTitle}</p>
          <Input value={selectedFilter} onChange={(event) => setSelectedFilter(event.target.value)} placeholder="Filter" className="mb-2 border-border bg-background" />
          <TransferList items={selectedRows} empty="Empty list" onClick={(item) => onMove(item, false)} direction="left" />
        </div>
      </div>
    </div>
  );
}

function TransferList({ items, empty, direction, onClick }: { items: string[]; empty: string; direction: "left" | "right"; onClick: (item: string) => void }) {
  const Icon = direction === "right" ? ChevronRight : ChevronLeft;
  return (
    <div className="overflow-hidden rounded-md border border-border bg-background">
      <button type="button" className="flex h-10 w-full items-center justify-center bg-muted">
        <Icon className="h-5 w-5" />
      </button>
      <div className="h-36 overflow-auto">
        {items.length === 0 ? (
          <p className="p-3 text-muted-foreground">{empty}</p>
        ) : (
          items.map((item) => (
            <button key={item} type="button" onClick={() => onClick(item)} className="block w-full px-3 py-1.5 text-left text-body hover:bg-success/10">
              {item}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function buildTrainingContent(input: {
  numbering: string;
  type: string;
  title: string;
  audience: TrainingAudience;
  occurrence: Occurrence;
  frequency: TrainingFrequency;
  start: string;
  end: string;
  completionDate: string;
  releaseMode: ReleaseMode;
  releaseDate: string;
  mainTrainer: string;
  selectedTrainers: string[];
  selectedDocuments: string[];
  sessions: { start: string; end: string }[];
  description: string;
  objectives: string;
  assessment: string;
}) {
  const lines = [
    `Numbering: ${input.numbering}`,
    `Type: ${input.type || "Document Training"}`,
    `Audience: ${AUDIENCE_LABELS[input.audience]}`,
    `Occurrence: ${input.occurrence}`,
    `Recurrence: ${input.occurrence === "Recurring" ? FREQUENCY_LABELS[input.frequency] : "-"}`,
    `Start: ${input.start || "-"}`,
    `End: ${input.end || "-"}`,
    `Completion Date: ${input.completionDate || "-"}`,
    `Release Date: ${input.releaseMode === "Scheduled" ? input.releaseDate || "Scheduled" : input.releaseMode}`,
    `Main Trainer: ${input.mainTrainer || "-"}`,
    `Additional Trainers: ${input.selectedTrainers.join(", ") || "-"}`,
    `Features: ${featureSummary(input)}`,
  ];
  input.sessions.forEach((session, index) => {
    if (input.occurrence === "Multiple" || session.start || session.end) {
      lines.push(`Start ${index + 1}: ${session.start || "-"}`);
      lines.push(`End ${index + 1}: ${session.end || "-"}`);
    }
  });
  lines.push(`Documents: ${input.selectedDocuments.join("; ") || "-"}`);
  lines.push("");
  lines.push("Description:");
  lines.push(stripRichText(input.description));
  lines.push("");
  lines.push("Learning Objectives:");
  lines.push(stripRichText(input.objectives));
  lines.push("");
  lines.push("Assessment / Completion Criteria:");
  lines.push(stripRichText(input.assessment));
  return lines.join("\n");
}

function featureSummary(input: { occurrence: Occurrence; selectedDocuments: string[]; selectedTrainers: string[] }) {
  const features: string[] = [input.occurrence];
  if (input.selectedDocuments.length > 0) features.push(`${input.selectedDocuments.length} document(s)`);
  if (input.selectedTrainers.length > 0) features.push(`${input.selectedTrainers.length} additional trainer(s)`);
  return features.join(", ");
}

function stripRichText(value: string) {
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
