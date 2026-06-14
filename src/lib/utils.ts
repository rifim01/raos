import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export const AIRPORTS = [
  { code: "DJB001", name: "Bandara Sultan Thaha", city: "Jambi", lat: -1.6318503590205926, lng: 103.6438520018439 },
  { code: "PKU001", name: "Bandara Sultan Syarif Kasim II", city: "Pekanbaru", lat: 0.4649444, lng: 101.4484722 },
  { code: "BTH001", name: "Bandara Hang Nadim", city: "Batam", lat: 1.1227222, lng: 104.1194444 },
  { code: "BPN001", name: "Bandara Sultan Aji Muhammad Sulaiman Sepinggan", city: "Balikpapan", lat: -1.2657500, lng: 116.9000833 },
  { code: "MDC001", name: "Bandara Sam Ratulangi", city: "Manado", lat: 1.5498778, lng: 124.9254778 },
  { code: "UPG001", name: "Bandara Sultan Hasanuddin", city: "Makassar", lat: -5.0771667, lng: 119.5541389 },
  { code: "CGK001", name: "Bandara Soekarno-Hatta", city: "Tangerang", lat: -6.1256, lng: 106.6558 },
] as const;

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  DIRECTOR: "Direktur",
  AIRPORT_COORDINATOR: "Koordinator Bandara",
  STAFF: "Staff",
  DRIVER: "Driver",
};

export const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-gray-100 text-gray-800",
  SUSPENDED: "bg-red-100 text-red-800",
  ON_DUTY: "bg-blue-100 text-blue-800",
  OFF_DUTY: "bg-yellow-100 text-yellow-800",
  WAITING: "bg-yellow-100 text-yellow-800",
  SERVING: "bg-blue-100 text-blue-800",
  DONE: "bg-green-100 text-green-800",
  VIOLATION: "bg-red-100 text-red-800",
  PRESENT: "bg-green-100 text-green-800",
  ABSENT: "bg-red-100 text-red-800",
  LATE: "bg-orange-100 text-orange-800",
  SICK: "bg-purple-100 text-purple-800",
  LEAVE: "bg-blue-100 text-blue-800",
  PAID: "bg-green-100 text-green-800",
  DRAFT: "bg-gray-100 text-gray-800",
  PROCESSED: "bg-blue-100 text-blue-800",
};
