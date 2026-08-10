import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  HiBell,
  HiChartBar,
  HiClipboardList,
  HiCog,
  HiCollection,
  HiDatabase,
  HiDocumentReport,
  HiDownload,
  HiFolder,
  HiHome,
  HiKey,
  HiLightningBolt,
  HiLogout,
  HiMenu,
  HiRefresh,
  HiShare,
  HiShieldCheck,
  HiSpeakerphone,
  HiTrash,
  HiUser,
  HiUserAdd,
  HiUsers,
  HiX,
} from "react-icons/hi";
import api from "../../services/api";
import { logoutUser } from "../../store/slices/authSlice";
import BrandLogo from "../ui/BrandLogo";
import { toggleTheme } from "../../store/slices/uiSlice";
import { formatFileSize } from "../../utils/fileUtils";
import AdminAnalytics from "./AdminAnalytics";
import { AdminProfile, AdminSettings } from "./AdminProfileSettings";
import { ConfirmProvider, useConfirm } from "../ui/ConfirmDialog";

const groups = [
  [
    "Monitor",
    [
      ["overview", "Dashboard Overview", HiHome],
      ["analytics", "Reports & Analytics", HiChartBar],
      ["activity", "Activity Monitoring", HiDocumentReport],
    ],
  ],
  [
    "Manage",
    [
      ["users", "User Management", HiUsers],
      ["files", "File Management", HiCollection],
      ["folders", "Folder Management", HiFolder],
      ["storage", "Storage Management", HiDatabase],
      ["shares", "Sharing Management", HiShare],
      ["trash", "Trash Management", HiTrash],
      ["requests", "File Requests", HiClipboardList],
    ],
  ],
  [
    "Govern",
    [
      ["security", "Security Management", HiShieldCheck],
      ["notifications", "Notifications", HiBell],
      ["ai", "AI Usage", HiLightningBolt],
      ["settings", "System Settings", HiCog],
      ["profile", "Admin Profile", HiUser],
    ],
  ],
];
const resourceTabs = new Set([
  "files",
  "folders",
  "storage",
  "shares",
  "trash",
  "requests",
  "ai",
]);

const AdminConsole = () => (
  <ConfirmProvider>
    <Console />
  </ConfirmProvider>
);

const Console = () => {
  const dispatch = useDispatch(),
    navigate = useNavigate(),
    client = useQueryClient();
  const user = useSelector((s) => s.auth.user),
    theme = useSelector((s) => s.ui.theme);
  const [tab, setTab] = useState("overview"),
    [menu, setMenu] = useState(false);
  const dashboard = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => api.get("/admin/dashboard").then((r) => r.data),
    refetchInterval: 30000,
  });
  const label = groups.flatMap((g) => g[1]).find((i) => i[0] === tab)?.[1];
  const Nav = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
        <BrandLogo className="h-11 w-11" iconClassName="text-2xl" />
        <div>
          <p className="font-bold text-white">AirDrive Control</p>
          <p className="text-[10px] uppercase tracking-[.22em] text-cyan-300/70">
            Platform command
          </p>
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto p-4">
        {groups.map(([name, items]) => (
          <div key={name}>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">
              {name}
            </p>
            {items.map(([id, text, Icon]) => (
              <button
                key={id}
                onClick={() => {
                  setTab(id);
                  setMenu(false);
                }}
                className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-medium ${tab === id ? "bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-300/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
              >
                <Icon className="text-base" />
                <span className="truncate">{text}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>
      <button
        onClick={async () => {
          await dispatch(logoutUser());
          navigate("/login", { replace: true });
        }}
        className="m-4 flex items-center gap-3 rounded-xl px-3 py-2 text-rose-300 hover:bg-rose-400/10"
      >
        <HiLogout />
        Sign out
      </button>
    </div>
  );
  return (
    <div className="admin-shell min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-white/10 bg-slate-950/85 backdrop-blur-2xl lg:block">
        <Nav />
      </aside>
      {menu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-slate-950/70"
            onClick={() => setMenu(false)}
          />
          <aside className="relative h-full w-72 bg-slate-950">
            <button
              className="absolute right-3 top-3 z-10 text-white"
              onClick={() => setMenu(false)}
            >
              <HiX />
            </button>
            <Nav />
          </aside>
        </div>
      )}
      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b border-white/30 bg-white/55 px-4 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/55 sm:px-7">
          <button
            className="glass-control p-2 lg:hidden"
            onClick={() => setMenu(true)}
          >
            <HiMenu />
          </button>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-cyan-600 dark:text-cyan-300">
              Central administration
            </p>
            <h1 className="text-xl font-black">{label}</h1>
          </div>
          <button
            className="glass-control p-2.5"
            onClick={() => client.invalidateQueries()}
          >
            <HiRefresh />
          </button>
          <button
            className="glass-control px-3 py-2 text-xs"
            onClick={() => dispatch(toggleTheme())}
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold">{user?.name}</p>
            <p className="text-[10px] text-slate-500">System administrator</p>
          </div>
        </header>
        <main className="mx-auto max-w-[1700px] p-4 sm:p-7">
          {tab === "overview" && <Overview data={dashboard.data} />}{" "}
          {tab === "analytics" && <AnalyticsPanel data={dashboard.data} />}{" "}
          {tab === "users" && <Users />}{" "}
          {resourceTabs.has(tab) && <Resources type={tab} />}{" "}
          {tab === "activity" && <Activity />}{" "}
          {tab === "security" && <Security />}{" "}
          {tab === "notifications" && <Notifications />}{" "}
          {tab === "settings" && <AdminSettings />}{" "}
          {tab === "profile" && <AdminProfile />}
        </main>
      </div>
    </div>
  );
};

const Title = ({ title, sub, action }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
    <div className="flex-1">
      <h2 className="text-xl font-black">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{sub}</p>
    </div>
    {action}
  </div>
);

const searchableText = (item) => JSON.stringify(item || {}).toLowerCase();
const useReportFilters = (items = [], dateField = "createdAt") => {
  const [reportSearch, setReportSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const filtered = items.filter((item) => {
    if (
      reportSearch &&
      !searchableText(item).includes(reportSearch.toLowerCase())
    )
      return false;
    if (dateField === null) return true;
    const rawDate = item?.[dateField] || item?.createdAt || item?.lastLoginAt;
    if (!rawDate) return !from && !to;
    const time = new Date(rawDate).getTime();
    if (from && time < new Date(`${from}T00:00:00`).getTime()) return false;
    if (to && time > new Date(`${to}T23:59:59.999`).getTime()) return false;
    return true;
  });
  return { reportSearch, setReportSearch, from, setFrom, to, setTo, filtered };
};

const exportReportPdf = async (title, rows, columns, range) => {
  const { jsPDF } = await import("jspdf");
  const dark = document.documentElement.classList.contains("dark");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const width = pdf.internal.pageSize.getWidth();
  const accent = dark ? [34, 211, 238] : [79, 70, 229];
  pdf.setFillColor(...(dark ? [8, 15, 31] : [241, 245, 249]));
  pdf.rect(0, 0, width, 92, "F");
  pdf.setTextColor(...accent);
  pdf.setFontSize(20);
  pdf.text("AirDrive Control", 36, 38);
  pdf.setTextColor(...(dark ? [226, 232, 240] : [15, 23, 42]));
  pdf.setFontSize(13);
  pdf.text(title, 36, 64);
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    `Generated ${new Date().toLocaleString()}${range ? ` | ${range}` : ""} | ${rows.length} records`,
    36,
    82,
  );
  let y = 118;
  const columnWidth = (width - 72) / columns.length;
  const drawHeader = () => {
    pdf.setFillColor(...accent);
    pdf.rect(36, y - 13, width - 72, 22, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    columns.forEach((column, index) =>
      pdf.text(column.label, 40 + index * columnWidth, y),
    );
    y += 24;
  };
  drawHeader();
  rows.forEach((row, rowIndex) => {
    if (y > 790) {
      pdf.addPage();
      y = 42;
      drawHeader();
    }
    if (rowIndex % 2 === 0) {
      pdf.setFillColor(...(dark ? [241, 245, 249] : [248, 250, 252]));
      pdf.rect(36, y - 13, width - 72, 22, "F");
    }
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(7.5);
    columns.forEach((column, index) => {
      const value = String(column.value(row) ?? "-");
      pdf.text(
        pdf.splitTextToSize(value, columnWidth - 8)[0] || "-",
        40 + index * columnWidth,
        y,
      );
    });
    y += 22;
  });
  pdf.save(
    `airdrive-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`,
  );
};

const ReportBar = ({ filters, title, rows, columns }) => (
  <div className="glass-panel flex flex-wrap items-end gap-3 p-4">
    <label className="min-w-52 flex-1">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Search
      </span>
      <input
        className="input py-2"
        placeholder={`Search ${title.toLowerCase()}`}
        value={filters.reportSearch}
        onChange={(event) => filters.setReportSearch(event.target.value)}
      />
    </label>
    <label>
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
        From date
      </span>
      <input
        type="date"
        className="input py-2"
        value={filters.from}
        max={filters.to || undefined}
        onChange={(event) => filters.setFrom(event.target.value)}
      />
    </label>
    <label>
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
        To date
      </span>
      <input
        type="date"
        className="input py-2"
        value={filters.to}
        min={filters.from || undefined}
        onChange={(event) => filters.setTo(event.target.value)}
      />
    </label>
    <button
      className="btn-secondary"
      onClick={() => {
        filters.setReportSearch("");
        filters.setFrom("");
        filters.setTo("");
      }}
    >
      Reset
    </button>
    <button
      className="btn-primary flex items-center gap-2"
      disabled={!rows.length}
      onClick={() =>
        exportReportPdf(
          title,
          rows,
          columns,
          filters.from || filters.to
            ? `${filters.from || "Start"} to ${filters.to || "Today"}`
            : "",
        )
      }
    >
      <HiDownload /> Generate PDF
    </button>
    <span className="w-full text-right text-xs text-slate-500">
      {rows.length} filtered records
    </span>
  </div>
);
const Overview = ({ data }) => {
  const stats = [
    ["Users", data?.totalUsers, HiUsers],
    ["Files", data?.totalFiles, HiCollection],
    ["Folders", data?.totalFolders, HiFolder],
    ["Storage", formatFileSize(data?.totalStorage || 0), HiDatabase],
    ["Active shares", data?.activeShares, HiShare],
    ["Trash", data?.trashedFiles, HiTrash],
    ["File requests", data?.fileRequests, HiClipboardList],
    ["Activity (30d)", data?.totalInteractions30d, HiLightningBolt],
  ];
  return (
    <div className="space-y-6">
      <section className="admin-hero rounded-[2rem] p-8 text-white">
        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">
          ● Platform control online
        </span>
        <h2 className="mt-5 text-3xl font-black sm:text-4xl">
          One command center for AirDrive.
        </h2>
        <p className="mt-3 max-w-3xl text-cyan-50/80">
          Monitor and control users, content, storage, sharing, security, AI,
          and infrastructure from a purpose-built administration workspace.
        </p>
      </section>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([l, v, I], n) => (
          <article className="glass-panel p-5" key={l}>
            <div
              className={`mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${n % 2 ? "from-indigo-400 to-violet-500" : "from-cyan-400 to-blue-500"} text-white`}
            >
              <I />
            </div>
            <p className="text-2xl font-black">
              {typeof v === "number" ? v.toLocaleString() : v || 0}
            </p>
            <p className="text-xs text-slate-500">{l}</p>
          </article>
        ))}
      </div>
      <AdminAnalytics dashboard={data} />
    </div>
  );
};

const AnalyticsPanel = ({ data }) => {
  return (
    <div className="space-y-5">
      <Title
        title="Reports & Analytics"
        sub="Platform usage, storage, user growth, and activity trends."
      />
      <AdminAnalytics dashboard={data} />
    </div>
  );
};

const Users = ({ roles = false }) => {
  const client = useQueryClient(),
    confirm = useConfirm();
  const [search, setSearch] = useState(""),
    [open, setOpen] = useState(false),
    [form, setForm] = useState({
      name: "",
      email: "",
      password: "",
      role: roles ? "admin" : "user",
    });
  const q = useQuery({
    queryKey: ["admin-users", search, roles],
    queryFn: () =>
      api
        .get("/admin/users", {
          params: {
            search: search || undefined,
            role: roles ? "admin" : undefined,
            limit: 100,
          },
        })
        .then((r) => r.data),
    refetchInterval: 15000,
  });
  const filters = useReportFilters(q.data?.users || []);
  const refresh = () => {
    client.invalidateQueries({ queryKey: ["admin-users"] });
    client.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };
  const update = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/admin/users/${id}`, body),
    onSuccess: () => {
      refresh();
      toast.success("Account updated");
    },
    onError: (e) => toast.error(e.response?.data?.error || "Update failed"),
  });
  const create = useMutation({
    mutationFn: (b) => api.post("/admin/users", b),
    onSuccess: () => {
      refresh();
      setOpen(false);
      toast.success("Account created");
    },
    onError: (e) => toast.error(e.response?.data?.error || "Creation failed"),
  });
  const suspend = async (u) => {
    if (
      await confirm({
        title: "Suspend account?",
        message: `${u.email} will lose access and active sessions.`,
        confirmLabel: "Suspend",
      })
    )
      api.delete(`/admin/users/${u._id}`).then(() => {
        refresh();
        toast.success("Account suspended");
      });
  };
  return (
    <div className="space-y-5">
      <Title
        title={roles ? "Admin & Role Management" : "User Management"}
        sub={
          roles
            ? "Manage administrators, roles, and platform access."
            : "Add, edit, activate, deactivate, suspend, and control quotas."
        }
        action={
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => setOpen(!open)}
          >
            <HiUserAdd />
            Add account
          </button>
        }
      />
      {open && (
        <form
          className="glass-panel grid gap-3 p-5 md:grid-cols-5"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(form);
          }}
        >
          <input
            className="input"
            required
            placeholder="Name"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="input"
            required
            type="email"
            placeholder="Email"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className="input"
            required
            type="password"
            placeholder="Temporary password"
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <select
            className="input"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <button className="btn-primary">Create</button>
        </form>
      )}
      <ReportBar
        filters={filters}
        title="User Management"
        rows={filters.filtered}
        columns={[
          { label: "Name", value: (u) => u.name },
          { label: "Email", value: (u) => u.email },
          { label: "Role", value: (u) => u.role },
          {
            label: "Status",
            value: (u) => (u.isActive ? "Active" : "Suspended"),
          },
          {
            label: "Storage",
            value: (u) =>
              `${formatFileSize(u.storageUsed || 0)} / ${formatFileSize(u.storageLimit || 0)}`,
          },
        ]}
      />
      <div className="glass-panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-white/20 p-4">
          <input
            className="input max-w-sm"
            placeholder="Search users"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="ml-auto text-xs text-slate-500">
            {q.data?.total || 0} accounts
          </span>
        </div>
        <Table
          heads={[
            "User",
            "Role",
            "Storage",
            "Status",
            "Last login",
            "Controls",
          ]}
        >
          {filters.filtered.map((u) => (
            <tr key={u._id}>
              <td>
                <b>{u.name}</b>
                <p className="text-xs text-slate-500">{u.email}</p>
              </td>
              <td>
                <select
                  className="glass-control p-1 text-xs"
                  value={u.role}
                  onChange={(e) =>
                    update.mutate({ id: u._id, role: e.target.value })
                  }
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td className="text-xs">
                {formatFileSize(u.storageUsed || 0)} /{" "}
                {formatFileSize(u.storageLimit || 0)}
              </td>
              <td>
                <span
                  className={`badge ${u.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}
                >
                  {u.isActive ? "Active" : "Suspended"}
                </span>
              </td>
              <td className="text-xs text-slate-500">
                {u.lastLoginAt
                  ? new Date(u.lastLoginAt).toLocaleString()
                  : "Never"}
              </td>
              <td>
                <div className="flex gap-2">
                  <button
                    className="glass-control p-1 text-xs"
                    onClick={() =>
                      update.mutate({ id: u._id, isActive: !u.isActive })
                    }
                  >
                    {u.isActive ? "Deactivate" : "Activate"}
                  </button>
                  {u.isActive && (
                    <button
                      className="rounded-lg bg-rose-500/10 p-1 text-xs text-rose-500"
                      onClick={() => suspend(u)}
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
};

const Resources = ({ type }) => {
  const client = useQueryClient(),
    confirm = useConfirm();
  const q = useQuery({
    queryKey: ["admin-resource", type],
    queryFn: () => api.get(`/admin/resources/${type}`).then((r) => r.data),
    refetchInterval: 30000,
  });
  const filters = useReportFilters(q.data?.items || []);
  const names = {
    files: "File & Folder Management",
    folders: "Folder Inventory",
    storage: "Storage Management",
    shares: "Sharing Management",
    trash: "Trash Management",
    requests: "File Request Management",
    ai: "AI Usage",
  };
  const act = async (item) => {
    const next =
      type === "trash"
        ? "restore"
        : type === "files"
          ? "trash"
          : item.isActive
            ? "deactivate"
            : "activate";
    if (
      !(await confirm({
        title: `${next} item?`,
        message: `Apply ${next} to ${item.name || item.title || "this item"}?`,
        danger: next !== "restore",
      }))
    )
      return;
    const url =
      type === "shares"
        ? `/admin/shares/${item._id}`
        : type === "requests"
          ? `/admin/requests/${item._id}`
          : `/admin/files/${item._id}`;
    const body = ["shares", "requests"].includes(type)
      ? { isActive: next === "activate" }
      : { action: next };
    api.patch(url, body).then(() => {
      client.invalidateQueries({ queryKey: ["admin-resource", type] });
      toast.success("Updated");
    });
  };
  return (
    <div className="space-y-5">
      <Title
        title={names[type]}
        sub="Platform-wide inventory with owner, status, usage, and administrative controls."
      />
      <ReportBar
        filters={filters}
        title={names[type]}
        rows={filters.filtered}
        columns={[
          {
            label: "Item",
            value: (i) => i.name || i.title || i.type || i.email,
          },
          { label: "Owner", value: (i) => i.userId?.email || i.email },
          {
            label: "Status",
            value: (i) =>
              i.trashed
                ? "Trashed"
                : i.isActive === false
                  ? "Inactive"
                  : i.role || "Active",
          },
          {
            label: "Created",
            value: (i) =>
              i.createdAt ? new Date(i.createdAt).toLocaleDateString() : "-",
          },
        ]}
      />
      <div className="glass-panel overflow-hidden">
        <Table
          heads={[
            "Item",
            "Owner",
            "Usage / details",
            "Status",
            "Created",
            "Control",
          ]}
        >
          {filters.filtered.map((i) => (
            <tr key={i._id}>
              <td>
                <b>{i.name || i.title || i.type || i.email}</b>
                <p className="text-xs text-slate-500">
                  {i.mimeType || i.fileId?.name || i.folderId?.name || i.model}
                </p>
              </td>
              <td className="text-xs">{i.userId?.email || i.email || "—"}</td>
              <td className="text-xs text-slate-500">
                {type === "storage"
                  ? `${formatFileSize(i.storageUsed || 0)} / ${formatFileSize(i.storageLimit || 0)}`
                  : type === "ai"
                    ? `${i.tokens || 0} tokens · ${i.duration || 0}ms`
                    : type === "shares"
                      ? `${i.permission} · ${i.accessCount || 0} accesses`
                      : type === "requests"
                        ? `${i.uploads?.length || 0} uploads`
                        : formatFileSize(i.size || 0)}
              </td>
              <td>
                <span className="badge bg-cyan-500/10 text-cyan-600">
                  {i.trashed
                    ? "Trashed"
                    : i.isActive === false
                      ? "Inactive"
                      : i.role || "Active"}
                </span>
              </td>
              <td className="text-xs">
                {i.createdAt ? new Date(i.createdAt).toLocaleDateString() : "—"}
              </td>
              <td>
                {["files", "trash", "shares", "requests"].includes(type) && (
                  <button
                    className="glass-control p-1 text-xs"
                    onClick={() => act(i)}
                  >
                    {type === "trash"
                      ? "Restore"
                      : type === "files"
                        ? "Trash"
                        : i.isActive
                          ? "Disable"
                          : "Enable"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </Table>
        {!q.isLoading && !filters.filtered.length && (
          <p className="p-10 text-center text-sm text-slate-500">
            No records found.
          </p>
        )}
      </div>
    </div>
  );
};

const Table = ({ heads, children }) => (
  <div className="overflow-x-auto">
    <table className="admin-table">
      <thead>
        <tr>
          {heads.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);
const Activity = () => {
  const q = useQuery({
    queryKey: ["system-logs"],
    queryFn: () => api.get("/admin/system-logs").then((r) => r.data),
    refetchInterval: 15000,
  });
  const filters = useReportFilters(q.data?.logs || []);
  return (
    <div className="space-y-5">
      <Title
        title="Activity Monitoring"
        sub="Uploads, downloads, deletions, restorations, sharing, AI actions, and logins."
      />
      <ReportBar
        filters={filters}
        title="Activity Monitoring"
        rows={filters.filtered}
        columns={[
          { label: "Action", value: (i) => i.action?.replaceAll("_", " ") },
          { label: "User", value: (i) => i.userId?.email },
          { label: "IP", value: (i) => i.ip },
          {
            label: "Time",
            value: (i) => new Date(i.createdAt).toLocaleString(),
          },
        ]}
      />
      <div className="glass-panel overflow-hidden">
        <Table heads={["Action", "User", "IP", "Device", "Time"]}>
          {filters.filtered.map((i) => (
            <tr key={i._id}>
              <td>
                <span className="badge bg-indigo-500/10 text-indigo-500">
                  {i.action.replaceAll("_", " ")}
                </span>
              </td>
              <td>{i.userId?.email}</td>
              <td>{i.ip || "—"}</td>
              <td className="max-w-xs truncate text-xs">{i.device || "—"}</td>
              <td className="text-xs">
                {new Date(i.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
};
const Security = () => {
  const q = useQuery({
    queryKey: ["admin-security"],
    queryFn: () => api.get("/admin/security").then((r) => r.data),
    refetchInterval: 30000,
  });
  const filters = useReportFilters(q.data?.recentLogins || []);
  return (
    <div className="space-y-5">
      <Title
        title="Security Management"
        sub="Failed logins, locked accounts, login origins, and account security."
      />
      <ReportBar
        filters={filters}
        title="Security Sessions"
        rows={filters.filtered}
        columns={[
          { label: "User", value: (i) => i.userId?.email },
          { label: "Role", value: (i) => i.userId?.role },
          { label: "IP address", value: (i) => i.ip },
          {
            label: "Login time",
            value: (i) => new Date(i.createdAt).toLocaleString(),
          },
        ]}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Metric
          icon={HiShieldCheck}
          label="Locked accounts"
          value={q.data?.lockedAccounts || 0}
        />
        <Metric
          icon={HiKey}
          label="Accounts with failures"
          value={q.data?.accountsWithFailures || 0}
        />
      </div>
      <div className="glass-panel p-5">
        <h3 className="mb-4 font-bold">Recent login sessions</h3>
        {filters.filtered.map((i) => (
          <div
            key={i._id}
            className="mb-2 flex gap-3 rounded-xl border border-white/20 p-3 text-xs"
          >
            <b>{i.userId?.email}</b>
            <span>{i.ip || "Unknown IP"}</span>
            <span className="ml-auto">
              {new Date(i.createdAt).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
const Notifications = () => {
  const [form, setForm] = useState({ title: "", message: "" });
  const q = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => api.get("/admin/notifications").then((r) => r.data),
    refetchInterval: 15000,
  });
  const filters = useReportFilters(q.data?.notifications || []);
  const send = useMutation({
    mutationFn: () => api.post("/admin/announcements", form),
    onSuccess: () => {
      setForm({ title: "", message: "" });
      toast.success("Sent");
    },
  });
  return (
    <div className="space-y-5">
      <ReportBar
        filters={filters}
        title="Administrator Notifications"
        rows={filters.filtered}
        columns={[
          { label: "Type", value: (i) => i.type },
          { label: "Title", value: (i) => i.title },
          { label: "Message", value: (i) => i.message },
          {
            label: "Time",
            value: (i) => new Date(i.createdAt).toLocaleString(),
          },
        ]}
      />
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <form
          className="glass-panel space-y-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            send.mutate();
          }}
        >
          <Title title="Send notification" sub="Broadcast to active users." />
          <input
            className="input"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            className="input"
            rows="5"
            placeholder="Message"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
          <button className="btn-primary flex items-center gap-2">
            <HiSpeakerphone />
            Send
          </button>
        </form>
        <div className="glass-panel p-5">
          <Title
            title="System alerts"
            sub="Administrator-only activity alerts."
          />
          <div className="mt-4 space-y-2">
            {filters.filtered.map((i) => (
              <div
                key={i._id}
                className="rounded-xl border border-white/20 p-3"
              >
                <b className="text-sm">{i.title}</b>
                <p className="text-xs text-slate-500">{i.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
const Metric = ({ icon: Icon, label, value }) => (
  <div className="glass-panel flex items-center gap-4 p-5">
    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-500">
      <Icon />
    </div>
    <div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  </div>
);
export default AdminConsole;
