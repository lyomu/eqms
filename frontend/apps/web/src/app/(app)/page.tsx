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
  Clock,
  AlarmClock,
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
      <div>
        <h1 className="text-h1 text-brand-primary">My Work</h1>
        <p className="text-body text-muted-foreground">Welcome, {firstName}.</p>
      </div>

      {/* Quick stats */}
      <section aria-label="Quick statistics">
        {stats.isLoading && <LoadingScreen label="Loading statistics…" />}
        {stats.isError && !stats.isLoading && (
          <ErrorAlert title="Couldn't load statistics" message="Unable to load system statistics." />
        )}
        {stats.data && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            <StatCard
              label="Documents"
              value={stats.data.totalDocuments}
              hint={`${stats.data.effectiveDocuments} effective`}
              icon={FileText}
            />
            <StatCard
              label="Pending Changes"
              value={stats.data.openChangeControls}
              hint={`${stats.data.totalChangeControls} total`}
              icon={GitPullRequestArrow}
            />
            <StatCard
              label="Active CAPAs"
              value={stats.data.openCapas}
              hint={`${stats.data.totalCapas} total`}
              icon={ClipboardCheck}
            />
            <StatCard
              label="Open Deviations"
              value={stats.data.openDeviations}
              hint={`${stats.data.totalDeviations} total`}
              icon={TriangleAlert}
            />
            <StatCard
              label="Active Products"
              value={stats.data.activeProducts}
              hint={`${stats.data.totalProducts} total`}
              icon={Package}
            />
            <StatCard
              label="Approved Materials"
              value={stats.data.approvedMaterials}
              hint={`${stats.data.totalMaterials} total`}
              icon={Boxes}
            />
            <StatCard
              label="Released Batches"
              value={stats.data.releasedBatchRecords}
              hint={`${stats.data.totalBatchRecords} total`}
              icon={Beaker}
            />
          </div>
        )}
      </section>

      {/* Compliance posture */}
      {compliance.data && (
        <section aria-label="Compliance status">
          <h2 className="mb-2 text-h3 text-brand-primary">Compliance Status</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Docs Due for Review" value={compliance.data.documentsDueForReview} icon={ClipboardList} />
            <StatCard label="Overdue CAPAs" value={compliance.data.overdueCapas} icon={ClipboardCheck} />
            <StatCard label="Overdue Changes" value={compliance.data.overdueChangeControls} icon={GitPullRequestArrow} />
            <StatCard label="Open Deviations" value={compliance.data.openDeviations} icon={TriangleAlert} />
            <StatCard label="Quarantined Batches" value={compliance.data.quarantinedBatches} icon={Beaker} />
          </div>
        </section>
      )}

      {/* My Work summary */}
      <section aria-label="My work summary" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Pending Approvals"
          value={myWork.isLoading ? "…" : (myWork.data?.pendingApprovals ?? 0)}
          icon={ClipboardCheck}
        />
        <StatCard
          label="My Due-Dated Tasks"
          value={myWork.isLoading ? "…" : (myWork.data?.myDueDatedTasks ?? 0)}
          icon={Clock}
        />
        <StatCard
          label="Unread Notifications"
          value={myWork.isLoading ? "…" : (myWork.data?.unreadNotifications ?? 0)}
          icon={AlarmClock}
        />
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
    </div>
  );
}
