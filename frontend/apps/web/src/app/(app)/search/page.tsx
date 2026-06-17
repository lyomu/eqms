"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface SearchResult {
  module: string;
  recordType: string;
  id: number;
  number: string;
  title: string;
  status: string;
  url: string;
  updatedAt: string;
}

function SearchPageContent() {
  const params = useSearchParams();
  const [term, setTerm] = useState(params.get("q") ?? "");
  const q = params.get("q") ?? "";
  const results = useQuery({
    queryKey: ["global-search", q],
    enabled: q.trim().length >= 2,
    queryFn: async (): Promise<SearchResult[]> => (await api.get(`/api/search?q=${encodeURIComponent(q)}`)).data,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-h1 text-brand-primary">Search</h1>
        <p className="text-body text-muted-foreground">Find documents, CAPAs, training, deviations, and products.</p>
      </div>
      <form
        className="flex max-w-3xl gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const next = term.trim();
          if (next) window.location.assign(`/search?q=${encodeURIComponent(next)}`);
        }}
      >
        <Input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search records..." />
        <Button type="submit"><Search className="h-4 w-4" />Search</Button>
      </form>
      <Card>
        <CardHeader><CardTitle>{q ? `Results for "${q}"` : "Start a Search"}</CardTitle></CardHeader>
        <CardContent>
          {!q ? (
            <p className="text-body text-muted-foreground">Enter at least two characters to search the system.</p>
          ) : results.isLoading ? (
            <LoadingSpinner label="Searching..." />
          ) : results.isError ? (
            <p className="text-body text-error">Search failed. Please try again.</p>
          ) : (results.data ?? []).length === 0 ? (
            <p className="text-body text-muted-foreground">No matching records found.</p>
          ) : (
            <div className="divide-y divide-border">
              {(results.data ?? []).map((item) => (
                <Link key={`${item.recordType}-${item.id}`} href={item.url} className="block py-3 transition hover:bg-muted/50">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info">{item.module}</Badge>
                    <span className="font-semibold text-brand-primary">{item.number}</span>
                    <span className="text-body">{item.title}</span>
                  </div>
                  <div className="mt-1 text-label text-muted-foreground">
                    {item.recordType} · {item.status} · Updated {formatDate(item.updatedAt)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingSpinner label="Loading search..." />}>
      <SearchPageContent />
    </Suspense>
  );
}
