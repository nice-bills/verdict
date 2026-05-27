import type { ButtonHTMLAttributes, ReactNode } from "react";

type GlassPanelProps = {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
  style?: React.CSSProperties;
};

export function GlassPanel({
  children,
  className = "",
  as: Tag = "div",
  style,
}: GlassPanelProps) {
  return (
    <Tag className={`glass-panel ${className}`.trim()} style={style}>
      {children}
    </Tag>
  );
}

export function GlassButton({
  children,
  className = "",
  variant = "glass",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "glass" | "ghost" | "yes" | "no";
}) {
  return (
    <button
      type={type}
      className={`glass-btn glass-btn--${variant} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function GlassLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a href={href} className={`glass-btn glass-btn--glass ${className}`.trim()}>
      {children}
    </a>
  );
}
