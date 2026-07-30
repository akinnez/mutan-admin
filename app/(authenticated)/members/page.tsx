"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { membersApi } from "@/lib/api/members";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Modal } from "@/components/shared/Modal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FormField, Input, Select } from "@/components/shared/FormField";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  MobileCard,
  MobileCardHeader,
  MobileRow,
} from "@/components/shared/MobileCard";
import {
  formatDate,
  formatCurrency,
  roleLabel,
  ROLE_OPTIONS,
  formatToNigeriaInternational,
} from "@/lib/utils/format";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import {
  Users,
  Search,
  Plus,
  Upload,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
} from "lucide-react";
import type { Member } from "@/lib/types";

const addSchema = z.object({
  full_name: z.string().min(2),
  phone_number: z
    .string()
    .min(10)
    .max(11)
    .regex(/^[0-9]{10,11}$/, "Enter 10-11 digit phone"),
  staff_id: z.string().min(1),
  date_joined: z.string().min(1),
  email: z.string().optional().or(z.literal("")),
  role: z.string().min(1).default("member"),
  workplace: z.string().optional().or(z.literal("")),
});
type AddForm = z.infer<typeof addSchema>;

export default function MembersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selected, setSelected] = useState<Member | null>(null);
  const [editTarget, setEditTarget] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [resetTarget, setResetTarget] = useState<Member | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["members", search, status, role, page],
    queryFn: () =>
      membersApi.list({
        search: search || undefined,
        membership_status: status || undefined,
        role: role || undefined,
        page,
        limit: 20,
      }),
  });

  const members: Member[] = data?.data?.data?.data ?? data?.data?.data ?? [];
  const total = data?.data?.data?.total ?? 0;
  const total_pages = data?.data?.data?.total_pages ?? 1;

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["member-detail", selected?.id],
    queryFn: () => membersApi.getOne(selected!.id),
    enabled: !!selected,
  });
  const memberDetail = detail?.data?.data ?? detail?.data;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(addSchema),
  });

  const addMutation = useMutation({
    mutationFn: (data: AddForm) => membersApi.add(data),
    onSuccess: () => {
      toast.success("Member added successfully");
      qc.invalidateQueries({ queryKey: ["members"] });
      setShowAdd(false);
      reset();
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message ?? "Failed to add member"),
  });

  const resetMutation = useMutation({
    mutationFn: (id: string) => membersApi.resetAccess(id),
    onSuccess: () => {
      toast.success("Access reset — member must re-verify via OTP");
      setResetTarget(null);
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message ?? "Reset failed"),
  });

  const editMutation = useMutation({
    mutationFn: (data: Record<string, string>) =>
      membersApi.update(
        editTarget!.id,
        Object.fromEntries(
          Object.entries(data).filter(([_, v]) => v !== "" && v !== undefined),
        ),
      ),
    onSuccess: () => {
      toast.success("Member updated successfully");
      qc.invalidateQueries({ queryKey: ["members"] });
      setEditTarget(null);
      setEditForm({});
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message ?? "Update failed"),
  });

  const openEdit = (m: Member) => {
    setEditTarget(m);
    setEditForm({
      full_name: m.full_name ?? "",
      phone_number: m.phone_number ?? "",
      staff_id: m.staff_id ?? "",
      email: (m as any).email ?? "",
      workplace_name: (m as any).workplace_name ?? "",
      date_joined: m.date_joined ? m.date_joined.slice(0, 10) : "",
      role: m.role ?? "member",
      membership_status: (m as any).membership_status ?? "active",
    });
  };

  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return membersApi.import(fd);
    },
    onSuccess: (res) => {
      const r = res.data?.data ?? res.data;
      toast.success(`Imported ${r.imported} members. ${r.skipped} skipped.`);
      qc.invalidateQueries({ queryKey: ["members"] });
      setShowImport(false);
      setImportFile(null);
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message ?? "Import failed"),
  });

  return (
    <div>
      <TopBar title="Members" subtitle="Manage cooperative members" />
      <div className="p-6">
        <PageHeader
          title="Member Registry"
          subtitle={`${total} members total`}
          action={
            <div className="flex gap-2">
              <button
                onClick={() => setShowImport(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <Upload size={14} /> Import Excel
              </button>
              <button
                onClick={() => setShowAdd(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={14} /> Add Member
              </button>
            </div>
          }
        />

        {/* Filters */}
        <div className="card p-4 mb-4 flex gap-3">
          <div className="flex-1 relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, MUTAN ID, staff ID…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border text-sm"
              style={{ borderColor: "#e2e8f0" }}
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border text-sm"
            style={{ borderColor: "#e2e8f0" }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="dormant">Dormant</option>
            <option value="exited">Exited</option>
          </select>
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border text-sm"
            style={{ borderColor: "#e2e8f0" }}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {isLoading ? (
            <p className="text-center py-12 text-gray-400 text-sm">
              Loading members…
            </p>
          ) : members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No members found"
              description="Try adjusting your search or add a new member."
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      style={{
                        background: "var(--forest-light)",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {[
                        "MUTAN ID",
                        "Name",
                        "Staff ID",
                        "Phone",
                        "Date Joined",
                        "Role",
                        "Status",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-3 text-xs font-semibold whitespace-nowrap"
                          style={{ color: "var(--forest)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr
                        key={m.id}
                        className="table-row-hover border-b last:border-0"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <td
                          className="px-4 py-3 font-mono text-xs font-medium whitespace-nowrap"
                          style={{ color: "var(--forest)" }}
                        >
                          {m.mutan_id}
                        </td>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">
                          {m.full_name}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {m.staff_id}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {m.phone_number}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {formatDate(m.date_joined)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="badge-gray px-2 py-0.5 rounded-full text-xs">
                            {roleLabel(m.role)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={m.membership_status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelected(m)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => openEdit(m)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setResetTarget(m)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                            >
                              <RefreshCw size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3 p-3">
                {members.map((m) => (
                  <MobileCard key={m.id}>
                    <MobileCardHeader
                      title={m.full_name}
                      subtitle={m.mutan_id}
                      right={<StatusBadge status={m.membership_status} />}
                    />
                    <MobileRow label="Staff ID" value={m.staff_id} />
                    <MobileRow label="Phone" value={m.phone_number} />
                    <MobileRow
                      label="Date Joined"
                      value={formatDate(m.date_joined)}
                    />
                    <MobileRow
                      label="Role"
                      value={
                        <span className="badge-gray px-2 py-0.5 rounded-full text-xs">
                          {roleLabel(m.role)}
                        </span>
                      }
                    />
                    <div
                      className="flex gap-2 mt-3 pt-2 border-t"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <button
                        onClick={() => setSelected(m)}
                        className="btn-secondary flex items-center justify-center gap-1.5 text-xs py-2"
                      >
                        <Eye size={13} /> View
                      </button>
                      <button
                        onClick={() => openEdit(m)}
                        className="btn-secondary flex items-center justify-center gap-1.5 text-xs py-2"
                        style={{ color: "#1d4ed8" }}
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        onClick={() => setResetTarget(m)}
                        className="btn-secondary flex items-center justify-center gap-1.5 text-xs py-2"
                        style={{ color: "#991b1b" }}
                      >
                        <RefreshCw size={13} /> Reset PIN
                      </button>
                    </div>
                  </MobileCard>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {total_pages > 1 && (
            <div
              className="flex items-center justify-between px-4 py-3 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <p className="text-xs text-gray-400">
                Page {page} of {total_pages} — {total} members
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border text-gray-500 disabled:opacity-40"
                  style={{ borderColor: "var(--border)" }}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(total_pages, p + 1))}
                  disabled={page === total_pages}
                  className="p-1.5 rounded-lg border text-gray-500 disabled:opacity-40"
                  style={{ borderColor: "var(--border)" }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      <Modal
        open={showAdd}
        onClose={() => {
          setShowAdd(false);
          reset();
        }}
        title="Add New Member"
        size="lg"
      >
        <form
          onSubmit={handleSubmit((d) => {
            const payload = {
              ...d,
              phone_number: formatToNigeriaInternational(d.phone_number),
            };
            console.log("Payload to send:", payload);
            return addMutation.mutate(payload);
          })}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Full Name"
              error={errors.full_name?.message as string | undefined}
              required
            >
              <Input
                {...register("full_name")}
                placeholder="Abubakar Ibrahim"
              />
            </FormField>
            <FormField
              label="Phone Number"
              error={errors.phone_number?.message as string | undefined}
              required
            >
              <Input
                maxLength={11}
                {...register("phone_number")}
                placeholder="08012345678"
              />
            </FormField>
            <FormField
              label="Staff ID"
              error={errors.staff_id?.message as string | undefined}
              required
            >
              <Input {...register("staff_id")} placeholder="GOV/OY/001" />
            </FormField>
            <FormField
              label="Mutan ID"
              error={errors.mutan_id?.message as string | undefined}
              required
            >
              <Input {...register("mutan_id")} placeholder="MS001 or MP001" />
            </FormField>
            <FormField
              label="Email Address"
              error={errors.email?.message as string | undefined}
            >
              <Input
                type="email"
                {...register("email")}
                placeholder="optional"
              />
            </FormField>
            <FormField
              label="Date Joined"
              error={errors.date_joined?.message as string | undefined}
              required
            >
              <Input type="date" {...register("date_joined")} />
            </FormField>
            <FormField
              label="Workplace"
              error={errors.workplace?.message as string | undefined}
            >
              <Input {...register("workplace")} placeholder="optional" />
            </FormField>
            <FormField label="Role">
              <Select {...register("role")}>
                <option value="member">Member</option>
                <option value="secretary">Secretary</option>
                <option value="financial_secretary">Financial Secretary</option>
                <option value="board_director">Board Director</option>
                <option value="chairman">Chairman</option>
              </Select>
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowAdd(false);
                reset();
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="btn-primary"
            >
              {addMutation.isPending ? "Adding…" : "Add Member"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Member Detail Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Member Profile"
        size="xl"
      >
        {detailLoading ? (
          <div className="flex justify-center py-8">
            <div
              className="w-6 h-6 border-2 border-gray-200 rounded-full animate-spin"
              style={{ borderTopColor: "var(--forest)" }}
            />
          </div>
        ) : (
          memberDetail && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  ["MUTAN ID", memberDetail.member?.mutan_id],
                  ["Staff ID", memberDetail.member?.staff_id],
                  ["Full Name", memberDetail.member?.full_name],
                  ["Phone", memberDetail.member?.phone_number],
                  ["Email", memberDetail.member?.email ?? "—"],
                  ["Date Joined", formatDate(memberDetail.member?.date_joined)],
                  ["Status", memberDetail.member?.membership_status],
                  ["Role", roleLabel(memberDetail.member?.role)],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="p-3 rounded-xl"
                    style={{ background: "var(--forest-light)" }}
                  >
                    <p className="text-xs text-gray-500 mb-0.5">{k}</p>
                    <p className="text-sm font-medium">{v}</p>
                  </div>
                ))}
              </div>
              <div>
                <h4
                  className="text-xs font-semibold mb-3"
                  style={{ color: "var(--forest)" }}
                >
                  WALLET BALANCES
                </h4>
                <div className="space-y-2">
                  {(memberDetail.wallets ?? []).map((w: any) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between px-3 py-2 rounded-xl border"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div>
                        <p className="text-sm font-medium">{w.scheme?.name}</p>
                        <p className="text-xs text-gray-400">
                          Contributed: {formatCurrency(w.total_contributed)}
                        </p>
                      </div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "var(--forest)" }}
                      >
                        {formatCurrency(w.balance)}
                      </p>
                    </div>
                  ))}
                  {!memberDetail.wallets?.length && (
                    <p className="text-sm text-gray-400">No wallets yet</p>
                  )}
                </div>
              </div>
            </div>
          )
        )}
      </Modal>

      {/* Import Modal */}
      <Modal
        open={showImport}
        onClose={() => {
          setShowImport(false);
          setImportFile(null);
        }}
        title="Bulk Import Members"
      >
        <div className="space-y-4">
          <div
            className="p-4 rounded-xl text-xs space-y-1"
            style={{
              background: "var(--forest-light)",
              color: "var(--forest)",
            }}
          >
            <p className="font-semibold mb-2">Excel template columns:</p>
            <p>
              • <strong>Full Name</strong> — member's full name
            </p>
            <p>
              • <strong>Phone Number</strong> — 10–14 digits
            </p>
            <p>
              • <strong>Staff ID</strong> — government staff ID
            </p>
            <p>
              • <strong>Date Joined</strong> — YYYY-MM-DD format
            </p>
            <p>
              • <strong>Email</strong> — optional
            </p>
          </div>
          <div
            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-forest-700 transition-colors"
            style={{ borderColor: importFile ? "var(--forest)" : "#e2e8f0" }}
            onClick={() => document.getElementById("import-file")?.click()}
          >
            <Upload size={24} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">
              {importFile
                ? importFile.name
                : "Click to select Excel file (.xlsx)"}
            </p>
            <input
              id="import-file"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowImport(false);
                setImportFile(null);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              disabled={!importFile || importMutation.isPending}
              onClick={() => importFile && importMutation.mutate(importFile)}
              className="btn-primary"
            >
              {importMutation.isPending ? "Importing…" : "Import"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reset Confirm */}
      <ConfirmDialog
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        onConfirm={() => resetTarget && resetMutation.mutate(resetTarget.id)}
        loading={resetMutation.isPending}
        title="Reset Member Access"
        message={`This will clear ${resetTarget?.full_name}'s password and PIN. They will need to re-verify via OTP and set new credentials.`}
        confirmLabel="Reset Access"
        variant="danger"
      />

      {/* Edit Member Modal */}
      <Modal
        open={!!editTarget}
        onClose={() => {
          setEditTarget(null);
          setEditForm({});
        }}
        title={`Edit — ${editTarget?.full_name ?? ""}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Full Name" required>
              <Input
                value={editForm.full_name ?? ""}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, full_name: e.target.value }))
                }
              />
            </FormField>
            <FormField label="Staff ID" required>
              <Input
                value={editForm.staff_id ?? ""}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, staff_id: e.target.value }))
                }
              />
            </FormField>
            <FormField label="Phone Number" required>
              <Input
                value={editForm.phone_number ?? ""}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, phone_number: e.target.value }))
                }
              />
            </FormField>
            <FormField label="Email">
              <Input
                type="email"
                value={editForm.email ?? ""}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </FormField>
            <FormField label="Workplace">
              <Input
                value={editForm.workplace_name ?? ""}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, workplace_name: e.target.value }))
                }
              />
            </FormField>
            <FormField label="Date Joined" required>
              <Input
                type="date"
                value={editForm.date_joined ?? ""}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, date_joined: e.target.value }))
                }
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Role" required>
              <Select
                value={editForm.role ?? "member"}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, role: e.target.value }))
                }
              >
                {ROLE_OPTIONS.map((opt: any) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Membership Status" required>
              <Select
                value={editForm.membership_status ?? "active"}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    membership_status: e.target.value,
                  }))
                }
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="dormant">Dormant</option>
                <option value="exited">Exited</option>
              </Select>
            </FormField>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => {
                setEditTarget(null);
                setEditForm({});
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => editMutation.mutate(editForm)}
              disabled={
                editMutation.isPending ||
                !editForm.full_name ||
                !editForm.phone_number
              }
              className="btn-primary"
            >
              {editMutation.isPending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
