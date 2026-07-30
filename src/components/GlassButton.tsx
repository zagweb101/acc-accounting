type GlassButtonProps = {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "outline";
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function GlassButton({ children, className = "", variant = "primary", ...props }: GlassButtonProps) {
  return (
    <button className={`${variant === "primary" ? "btn" : "btn-outline"} ${className}`} {...props}>
      {children}
    </button>
  );
}
