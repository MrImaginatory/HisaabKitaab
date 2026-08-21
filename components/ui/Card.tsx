import * as React from "react";

export function Card({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
export function CardHeader({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-5 py-4 border-b border-[var(--color-hairline-on-dark)] ${className}`} {...props} />;
}
export function CardContent({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-5 ${className}`} {...props} />;
}
