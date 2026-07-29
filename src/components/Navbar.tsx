import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="glass fixed top-4 left-1/2 -translate-x-1/2 z-50 px-8 py-3 flex items-center gap-8 min-w-[600px] justify-center">
      <Link href="/" className="text-white/90 font-semibold tracking-tight text-lg">
        ACC
      </Link>
      <div className="flex items-center gap-6 text-sm">
        <Link href="/" className="text-white/50 hover:text-white/80 transition-colors duration-200">
          Home
        </Link>
        <Link href="/about" className="text-white/50 hover:text-white/80 transition-colors duration-200">
          About
        </Link>
        <Link href="/services" className="text-white/50 hover:text-white/80 transition-colors duration-200">
          Services
        </Link>
        <Link href="/contact" className="text-white/50 hover:text-white/80 transition-colors duration-200">
          Contact
        </Link>
        <Link href="/reviews" className="text-white/50 hover:text-white/80 transition-colors duration-200">
          Reviews
        </Link>
      </div>
    </nav>
  );
}
