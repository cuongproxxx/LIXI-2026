"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { formatVnd } from "@/lib/format";
import type { DeckItem } from "@/lib/types";

interface AdminStatusResponse {
  requiresSetup: boolean;
  authenticated: boolean;
  deck?: DeckItem[];
  remainingTotal?: number;
}

interface DeckRowForm {
  id: string;
  amount: string;
  quantity: string;
  remaining: string;
}

const EMPTY_ROW: DeckRowForm = {
  id: "seed",
  amount: "10000",
  quantity: "1",
  remaining: "1"
};

function createRowId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function mapDeckToRows(deck: DeckItem[]): DeckRowForm[] {
  return deck.map((item) => ({
    id: createRowId(),
    amount: String(item.amount),
    quantity: String(item.quantity),
    remaining: String(item.remaining)
  }));
}

function parseDeckRows(rows: DeckRowForm[]): { deck: DeckItem[]; error: string } | { deck: DeckItem[]; error: null } {
  const deck = rows.map((row) => ({
    amount: Number(row.amount),
    quantity: Number(row.quantity),
    remaining: Number(row.remaining)
  }));

  if (deck.length === 0) return { deck: [], error: "Deck cần ít nhất một dòng." };
  if (deck.some((item) => !Number.isInteger(item.amount) || item.amount < 1000)) {
    return { deck, error: "Amount phải là số nguyên từ 1.000 trở lên." };
  }
  if (deck.some((item) => !Number.isInteger(item.quantity) || item.quantity <= 0)) {
    return { deck, error: "Quantity phải là số nguyên lớn hơn 0." };
  }
  if (deck.some((item) => !Number.isInteger(item.remaining) || item.remaining < 0)) {
    return { deck, error: "Remaining phải là số nguyên không âm." };
  }
  if (deck.some((item) => item.remaining > item.quantity)) {
    return { deck, error: "Remaining không được lớn hơn Quantity." };
  }

  const amounts = new Set<number>();
  for (const item of deck) {
    if (amounts.has(item.amount)) return { deck, error: "Amount đang bị trùng." };
    amounts.add(item.amount);
  }
  return { deck, error: null };
}

export function AdminPanel() {
  const [status, setStatus] = useState<AdminStatusResponse | null>(null);
  const [rows, setRows] = useState<DeckRowForm[]>([{ ...EMPTY_ROW, id: createRowId() }]);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const parsedRows = useMemo(() => parseDeckRows(rows), [rows]);
  const previewTotal = useMemo(() => parsedRows.deck.reduce((sum, item) => sum + item.remaining, 0), [parsedRows.deck]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/status", { cache: "no-store" });
      const data = (await response.json()) as AdminStatusResponse;
      setStatus(data);
      if (data.deck && data.deck.length > 0) setRows(mapDeckToRows(data.deck));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");
    setSaveMessage("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setLoginError(body.error ?? "Đăng nhập thất bại.");
        return;
      }
      setPassword("");
      await loadStatus();
    } catch {
      setLoginError("Không thể kết nối đến server.");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setStatus((prev) => (prev ? { ...prev, authenticated: false } : prev));
    setSaveMessage("");
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError("");
    setSaveMessage("");
    if (parsedRows.error) {
      setSaveError(parsedRows.error);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deck: parsedRows.deck })
      });
      const body = (await response.json()) as { error?: string; deck?: DeckItem[]; remainingTotal?: number };
      if (!response.ok) {
        setSaveError(body.error ?? "Không thể lưu deck.");
        return;
      }
      if (body.deck) setRows(mapDeckToRows(body.deck));
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              deck: body.deck ?? prev.deck,
              remainingTotal: body.remainingTotal ?? prev.remainingTotal
            }
          : prev
      );
      setSaveMessage("Đã lưu deck thành công.");
    } catch {
      setSaveError("Không thể kết nối đến server.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="festive-backdrop min-h-screen px-4 py-8">
        <div className="mx-auto w-full max-w-4xl rounded-3xl border border-[#edd4a2] bg-white/80 p-6 shadow-card-soft">
          <p className="text-sm text-[#7b5b3b]">Đang tải trang quản trị...</p>
        </div>
      </main>
    );
  }

  if (status?.requiresSetup) {
    return (
      <main className="festive-backdrop min-h-screen px-4 py-8">
        <div className="mx-auto w-full max-w-4xl rounded-3xl border border-[#edd4a2] bg-white/85 p-6 shadow-card-soft">
          <h1 className="text-2xl text-[#65161a]">Thiết lập bảo vệ admin</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#7b5b3b]">
            Chưa có <code>ADMIN_PASSWORD</code>. Vui lòng thêm biến này vào <code>.env.local</code> rồi khởi
            động lại server.
          </p>
        </div>
      </main>
    );
  }

  if (!status?.authenticated) {
    return (
      <main className="festive-backdrop min-h-screen px-4 py-8">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-[#edd4a2] bg-white/85 p-6 shadow-card-soft">
          <h1 className="text-2xl text-[#65161a]">Đăng nhập admin</h1>
          <p className="mt-1 text-sm text-[#7b5b3b]">Nhập mật khẩu để chỉnh deck mệnh giá.</p>
          <form onSubmit={handleLogin} className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[#6b3d2f]">Mật khẩu</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="focus-ring w-full rounded-xl border border-[#e7c98a] bg-white/90 px-4 py-3 text-[15px] text-[#3b2a22]"
                required
              />
            </label>
            <button
              type="submit"
              className="cta-press w-full rounded-xl bg-gradient-to-r from-[#9f262b] to-[#7f181b] px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#fff5df]"
            >
              Vào trang quản trị
            </button>
            {loginError && <p className="text-sm text-[#b32229]">{loginError}</p>}
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="festive-backdrop min-h-screen px-4 py-8">
      <div className="mx-auto w-full max-w-5xl rounded-3xl border border-[#edd4a2] bg-white/85 p-5 shadow-card-soft sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#9b262b]">Admin</p>
            <h1 className="mt-1 text-2xl text-[#65161a]">Quản lý Deck Lì Xì</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setRows((prev) => [...prev, { id: createRowId(), amount: "10000", quantity: "1", remaining: "1" }])
              }
              className="rounded-lg border border-[#d5ad6a] bg-white px-3 py-2 text-sm font-medium text-[#7b4a2e] hover:bg-[#fff2d7]"
            >
              + Thêm
            </button>
            <button
              type="button"
              onClick={() => setRows((prev) => prev.map((row) => ({ ...row, remaining: row.quantity || "0" })))}
              className="rounded-lg border border-[#d5ad6a] bg-white px-3 py-2 text-sm font-medium text-[#7b4a2e] hover:bg-[#fff2d7]"
            >
              Reset remaining
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-[#d5ad6a] bg-white px-3 py-2 text-sm font-medium text-[#7b4a2e] hover:bg-[#fff2d7]"
            >
              Đăng xuất
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-6 space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-[#edd4a2] bg-[#fff8ea]">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-[#fff2d8] text-left text-[#7b4a2e]">
                <tr>
                  <th className="px-3 py-3 font-semibold">Amount</th>
                  <th className="px-3 py-3 font-semibold">Quantity</th>
                  <th className="px-3 py-3 font-semibold">Remaining</th>
                  <th className="px-3 py-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-[#efddbb]">
                    <td className="px-3 py-2">
                      <input
                        value={row.amount}
                        onChange={(event) =>
                          setRows((prev) =>
                            prev.map((item) => (item.id === row.id ? { ...item, amount: event.target.value } : item))
                          )
                        }
                        className="focus-ring w-28 rounded-lg border border-[#e2c38b] px-2 py-1.5"
                        inputMode="numeric"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.quantity}
                        onChange={(event) =>
                          setRows((prev) =>
                            prev.map((item) =>
                              item.id === row.id ? { ...item, quantity: event.target.value } : item
                            )
                          )
                        }
                        className="focus-ring w-24 rounded-lg border border-[#e2c38b] px-2 py-1.5"
                        inputMode="numeric"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.remaining}
                        onChange={(event) =>
                          setRows((prev) =>
                            prev.map((item) =>
                              item.id === row.id ? { ...item, remaining: event.target.value } : item
                            )
                          )
                        }
                        className="focus-ring w-24 rounded-lg border border-[#e2c38b] px-2 py-1.5"
                        inputMode="numeric"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setRows((prev) => prev.filter((item) => item.id !== row.id))}
                        className="rounded-lg border border-[#d6ad69] px-2.5 py-1.5 text-xs font-medium text-[#8a4b34] hover:bg-[#fff0d1]"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#edd4a2] bg-[#fff8ea] px-4 py-3">
            <div className="space-y-1 text-sm text-[#7b4a2e]">
              <p>
                Remaining hiện tại: <span className="font-semibold text-[#65161a]">{previewTotal}</span>
              </p>
              <p>
                Trạng thái server:{" "}
                <span className="font-semibold text-[#65161a]">{status.remainingTotal ?? 0} lượt còn lại</span>
              </p>
              <p>
                Mệnh giá:{" "}
                <span className="font-semibold text-[#65161a]">
                  {parsedRows.deck.length ? parsedRows.deck.map((item) => formatVnd(item.amount)).join(", ") : "Trống"}
                </span>
              </p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="cta-press rounded-xl bg-gradient-to-r from-[#9f262b] to-[#7f181b] px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#fff5df] disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Save deck"}
            </button>
          </div>

          {parsedRows.error && <p className="text-sm text-[#b32229]">{parsedRows.error}</p>}
          {saveError && <p className="text-sm text-[#b32229]">{saveError}</p>}
          {saveMessage && <p className="text-sm text-[#49753e]">{saveMessage}</p>}
        </form>
      </div>
    </main>
  );
}
