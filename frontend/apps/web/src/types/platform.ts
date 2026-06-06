export interface PlatformModule {
  id: number;
  code: string;
  name: string;
  description?: string;
  active?: boolean;
  enabled?: boolean;
  status?: string;
  expiresAt?: string | null;
}

export interface PlatformPlan {
  id: number;
  code: string;
  name: string;
  description?: string;
  userLimit?: number | null;
  siteLimit?: number | null;
  moduleCount?: number;
  active?: boolean;
  custom?: boolean;
}

export interface PlatformOrganization {
  id: number;
  code: string;
  name: string;
  legalName?: string;
  status: "trialing" | "active" | "past_due" | "expired" | "suspended" | "cancelled";
  primaryContactName?: string;
  primaryContactEmail?: string;
  country?: string;
  timezone?: string;
  planCode?: string;
  planName?: string;
  userLimit?: number | null;
  siteLimit?: number | null;
  userCount?: number;
  expiresAt?: string | null;
  modules?: PlatformModule[];
}
