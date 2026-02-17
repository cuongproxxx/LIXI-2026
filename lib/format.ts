export function formatVnd(amount: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(amount)}đ`;
}

export function formatBangkokTime(isoDate: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Bangkok",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(isoDate));
}
