import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="card fixed top-4 left-1/2 -translate-x-1/2 z-50 px-8 py-2.5 flex items-center gap-8 min-w-[600px] justify-center">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-[#2563eb] flex items-center justify-center text-white text-xs font-bold">A</div>
        <span className="text-gray-900 font-bold text-lg">ACC</span>
      </Link>
      <div className="flex items-center gap-6 text-sm">
        <Link href="/" className="text-gray-500 hover:text-[#2563eb] transition-colors duration-150">
          الرئيسية
        </Link>
        <Link href="/about" className="text-gray-500 hover:text-[#2563eb] transition-colors duration-150">
          عن البرنامج
        </Link>
        <Link href="/services" className="text-gray-500 hover:text-[#2563eb] transition-colors duration-150">
          الخدمات
        </Link>
        <Link href="/contact" className="text-gray-500 hover:text-[#2563eb] transition-colors duration-150">
          اتصل بنا
        </Link>
        <Link href="/reviews" className="text-gray-500 hover:text-[#2563eb] transition-colors duration-150">
          آراء العملاء
        </Link>
      </div>
    </nav>
  );
}
