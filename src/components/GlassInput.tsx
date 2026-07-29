type GlassInputProps = {
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export default function GlassInput({ className = "", ...props }: GlassInputProps) {
  return (
    <input className={`glass-input ${className}`} {...props} />
  );
}
