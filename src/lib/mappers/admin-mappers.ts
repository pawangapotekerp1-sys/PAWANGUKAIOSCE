import type { AdminMetric } from "../../mocks/admin-content";

export type AdminDashboardViewModel = {
  metrics: AdminMetric[];
  userPulse: {
    title: string;
    detail: string;
  };
  reviewPulse: {
    title: string;
    detail: string;
  };
  paymentQueuePreview: Array<{
    id: string;
    name: string;
    packageName: string;
    submittedAt: string;
    statusLabel: "Pending" | "Perbaikan";
    tone: "gold" | "teal";
  }>;
  reviewQueueSummary: Array<{
    id: string;
    title: string;
    detail: string;
  }>;
};

export type AdminDashboardSource = {
  pendingPaymentCount: number;
  totalUsers: number;
  totalAttempts: number;
  paymentQueuePreview: Array<{
    id: string;
    fullName: string | null;
    email: string | null;
    packageCode: string;
    createdAt: string;
    status: "pending_review" | "active" | "rejected" | "expired";
  }>;
};

function formatCount(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatPackageName(packageCode: string) {
  if (packageCode === "pro_30_hari") {
    return "Pro 30 Hari";
  }

  if (packageCode === "sprint_14_hari") {
    return "Sprint 14 Hari";
  }

  return packageCode;
}

function formatSubmittedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Waktu belum tersedia";
  }

  const timeLabel = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date).replace(".", ":");

  return `${timeLabel} WIB`;
}

export function mapAdminDashboardViewModel(source: AdminDashboardSource): AdminDashboardViewModel {
  return {
    metrics: [
      {
        label: "Pembayaran menunggu",
        value: `${formatCount(source.pendingPaymentCount)} pembayaran`,
        tone: "gold",
      },
      {
        label: "Pengguna aktif",
        value: `${formatCount(source.totalUsers)} pengguna`,
        tone: "teal",
      },
      {
        label: "Sesi tercatat",
        value: `${formatCount(source.totalAttempts)} sesi`,
        tone: "green",
      },
    ],
    userPulse: {
      title: "Pengguna aktif terpantau",
      detail: `${formatCount(source.totalUsers)} akun sudah tercatat di funnel belajar dan langganan.`,
    },
    reviewPulse: {
      title: "Tindak lanjut pembayaran",
      detail: `${formatCount(source.pendingPaymentCount)} pembayaran masih menunggu keputusan admin.`,
    },
    paymentQueuePreview: source.paymentQueuePreview.map((item) => ({
      id: item.id,
      name: item.fullName ?? item.email ?? "User belum bernama",
      packageName: formatPackageName(item.packageCode),
      submittedAt: formatSubmittedAt(item.createdAt),
      statusLabel: item.status === "pending_review" ? "Pending" : "Perbaikan",
      tone: item.status === "pending_review" ? "gold" : "teal",
    })),
    reviewQueueSummary: [],
  };
}
