type GlassCardProps = {
  children: React.ReactNode;
  className?: string;
};

export default function GlassCard({ children, className = "" }: GlassCardProps) {
  return (
    <div className={`card card-hover ${className}`}>
      {children}
    </div>
  );
}
