import { cn } from "@/lib/utils";

// Tint follows the name, so a person keeps the same colour on every panel.
const TINTS = [
  "bg-blue-100 text-blue-800", "bg-pink-100 text-pink-800", "bg-indigo-100 text-indigo-800",
  "bg-green-100 text-green-800", "bg-amber-100 text-amber-800", "bg-orange-100 text-orange-800",
];

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const tint = TINTS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];
  return (
    <span aria-hidden className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold", tint, className)}>
      {initials}
    </span>
  );
}
