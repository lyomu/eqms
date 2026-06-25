"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface TransferOption {
  id: number;
  label: string;
  description?: string;
}

interface DualListTransferProps {
  title: string;
  options: TransferOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  loading?: boolean;
}

/** Shared two-pane selector used for regulated record relationships and assignments. */
export function DualListTransfer({ title, options, selectedIds, onChange, loading = false }: DualListTransferProps) {
  const [search, setSearch] = useState("");
  const [availableFilter, setAvailableFilter] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("");
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const normalizedSearch = search.trim().toLowerCase();

  const availableOptions = useMemo(() => options.filter((option) => {
    const haystack = `${option.label} ${option.description ?? ""}`.toLowerCase();
    return !selected.has(option.id)
      && (!normalizedSearch || haystack.includes(normalizedSearch))
      && (!availableFilter || haystack.includes(availableFilter.toLowerCase()));
  }), [availableFilter, normalizedSearch, options, selected, selectedIds]);

  const selectedOptions = useMemo(() => options.filter((option) => {
    const haystack = `${option.label} ${option.description ?? ""}`.toLowerCase();
    return selected.has(option.id) && (!selectedFilter || haystack.includes(selectedFilter.toLowerCase()));
  }), [options, selected, selectedFilter, selectedIds]);

  return (
    <div className="space-y-3">
      <Label>{title}</Label>
      <div className="flex max-w-4xl">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by number or title..."
          className="rounded-r-none bg-background"
        />
        <Button type="button" variant="outline" className="rounded-l-none border-l-0" aria-label="Search">
          <Search className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <TransferPane
          title={loading ? "Loading documents..." : `Available (${availableOptions.length})`}
          value={availableFilter}
          onFilter={setAvailableFilter}
          options={availableOptions}
          empty="No matching documents"
          direction="right"
          onOne={(id) => onChange([...selectedIds, id])}
          onAll={() => onChange([...selectedIds, ...availableOptions.map((option) => option.id)])}
        />
        <TransferPane
          title={selectedOptions.length ? `Selected (${selectedOptions.length})` : "Empty list"}
          value={selectedFilter}
          onFilter={setSelectedFilter}
          options={selectedOptions}
          empty="No documents selected"
          direction="left"
          onOne={(id) => onChange(selectedIds.filter((value) => value !== id))}
          onAll={() => onChange(selectedIds.filter((id) => !selectedOptions.some((option) => option.id === id)))}
        />
      </div>
    </div>
  );
}

function TransferPane({
  title,
  value,
  onFilter,
  options,
  empty,
  direction,
  onOne,
  onAll,
}: {
  title: string;
  value: string;
  onFilter: (value: string) => void;
  options: TransferOption[];
  empty: string;
  direction: "left" | "right";
  onOne: (id: number) => void;
  onAll: () => void;
}) {
  const One = direction === "right" ? ChevronRight : ChevronLeft;
  const All = direction === "right" ? ChevronsRight : ChevronsLeft;
  return (
    <div className="space-y-2">
      <p className="text-body font-medium">{title}</p>
      <Input value={value} onChange={(event) => onFilter(event.target.value)} placeholder="Filter" className="bg-background" />
      <div className="overflow-hidden rounded-md border border-border bg-background">
        <div className="grid grid-cols-2 border-b border-border bg-muted/70">
          <button type="button" onClick={onAll} className="flex h-10 items-center justify-center border-r border-border hover:bg-accent" aria-label={`Move all ${direction}`}>
            <All className="h-5 w-5" />
          </button>
          <span className="flex h-10 items-center justify-center text-label text-muted-foreground">
            {direction === "right" ? "Add" : "Remove"}
          </span>
        </div>
        <div className="h-48 overflow-y-auto">
          {options.length ? options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onOne(option.id)}
              className="flex w-full items-center gap-3 border-b border-border/60 px-3 py-2 text-left last:border-0 hover:bg-accent/60"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-medium">{option.label}</span>
                {option.description ? <span className="block truncate text-label text-muted-foreground">{option.description}</span> : null}
              </span>
              <One className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          )) : <p className="px-3 py-8 text-center text-label text-muted-foreground">{empty}</p>}
        </div>
      </div>
    </div>
  );
}
