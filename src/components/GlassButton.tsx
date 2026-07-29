type GlassButtonProps = {
  children: React.ReactNode;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function GlassButton({ children, className = "", ...props }: GlassButtonProps) {
  return (
    <button className={`btn ${className}`} {...props}>
      {children}
    </button>
  );
}
