"use client";

import {
  FileText,
  GitPullRequestArrow,
  ClipboardCheck,
  TriangleAlert,
  Package,
  Boxes,
  Beaker,
  ClipboardList,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useStatistics,
  useMyWork,
  useMyApprovals,
  useDueSoon,
  useOverdueItems,
  useComplianceStatus,
} from "@/hooks/useDashboard";
import { StatCard } from "@/components/dashboard/StatCard";
import { TaskListCard } from "@/components/dashboard/TaskListCard";
import { DashboardGraphs } from "@/components/dashboard/DashboardGraphs";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const firstName = currentUser?.fullName?.split(" ")[0] ?? "there";

  const stats = useStatistics();
  const myWork = useMyWork();
  const approvals = useMyApprovals();
  const dueSoon = useDueSoon();
  const overdue = useOverdueItems();
  const compliance = useComplianceStatus();

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="overflow-hidden rounded-lg border border-border/80 bg-card shadow-sm shadow-slate-200/60">
        <div className="flex flex-wrap items-center gap-4 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-h1 text-foreground">My Work</h1>
            <p className="text-body text-muted-foreground">
              Welcome, {firstName}. Here is today&apos;s quality workload at a glance.
            </p>
          </div>
        </div>
      </div>

      {/* Main overview */}
      <section aria-label="Main overview">
        {stats.isLoading && <LoadingScreen label="Loading statistics…" />}
        {stats.isError && !stats.isLoading && (
          <ErrorAlert title="Couldn't load statistics" message="Unable to load system statistics." />
        )}
        {stats.data && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Documents"
              value={stats.data.totalDocuments}
              hint={`${stats.data.effectiveDocuments} effective`}
              icon={FileText}
              tone="blue"
            />
            <StatCard
              label="Pending Changes"
              value={stats.data.openChangeControls}
              hint={`${stats.data.totalChangeControls} total`}
              icon={GitPullRequestArrow}
              tone="teal"
            />
            <StatCard
              label="Active CAPAs"
              value={stats.data.openCapas}
              hint={`${stats.data.totalCapas} total`}
              icon={ClipboardCheck}
              tone="green"
            />
            <StatCard
              label="Open Deviations"
              value={stats.data.openDeviations}
              hint={`${stats.data.totalDeviations} total`}
              icon={TriangleAlert}
              tone="amber"
            />
            <StatCard
              label="Active Products"
              value={stats.data.activeProducts}
              hint={`${stats.data.totalProducts} total`}
              icon={Package}
              tone="violet"
            />
            <StatCard
              label="Approved Materials"
              value={stats.data.approvedMaterials}
              hint={`${stats.data.totalMaterials} total`}
              icon={Boxes}
              tone="teal"
            />
            <StatCard
              label="Released Batches"
              value={stats.data.releasedBatchRecords}
              hint={`${stats.data.totalBatchRecords} total`}
              icon={Beaker}
              tone="slate"
            />
            <StatCard
              label="Pending Approvals"
              value={myWork.isLoading ? "…" : (myWork.data?.pendingApprovals ?? 0)}
              hint="awaiting action"
              icon={ClipboardList}
              tone="green"
            />
          </div>
        )}
      </section>

      {/* Actionable lists */}
      <section aria-label="Tasks" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TaskListCard
          title="Pending Approvals"
          icon={ClipboardCheck}
          items={approvals.data?.items}
          isLoading={approvals.isLoading}
          isError={approvals.isError}
          emptyText="Nothing awaiting your approval."
        />
        <TaskListCard
          title="Due Soon"
          icon={ClipboardList}
          items={dueSoon.data}
          isLoading={dueSoon.isLoading}
          isError={dueSoon.isError}
          emptyText="Nothing due in the next 7 days."
        />
        <TaskListCard
          title="Overdue"
          icon={TriangleAlert}
          items={overdue.data}
          isLoading={overdue.isLoading}
          isError={overdue.isError}
          emptyText="No overdue items."
          overdue
        />
      </section>

      <DashboardGraphs
        statistics={stats.data}
        compliance={compliance.data}
        approvals={approvals.data}
      />
    </div>
  );
}
