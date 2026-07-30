import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";

const services = [
  { icon: "⊡", title: "الفواتير الإلكترونية", desc: "أصدر فواتير مبيعات ومشتريات إلكترونية متوافقة مع ضريبة القيمة المضافة وZATCA.", color: "bg-blue-50 text-blue-600" },
  { icon: "◈", title: "إدارة الحسابات", desc: "دليل حسابات هرمي مع قيود يومية آلية ودفتر أستاذ وميزان مراجعة.", color: "bg-blue-50 text-blue-600" },
  { icon: "▣", title: "إدارة المخزون", desc: "تتبع المخزون مع الجرد الدوري والتسعير وتكلفة البضاعة المباعة.", color: "bg-blue-50 text-blue-600" },
  { icon: "◉", title: "إدارة العملاء", desc: "جهات اتصال مع متابعة الأرصدة والحدود الائتمانية وأعمار الديون.", color: "bg-blue-50 text-blue-600" },
  { icon: "◇", title: "التقارير المالية", desc: "تقارير متقدمة — قائمة دخل، ميزانية، تدفق نقدي، تقادم الذمم.", color: "bg-blue-50 text-blue-600" },
  { icon: "⊞", title: "مراكز التكلفة", desc: "حلل الإيرادات والمصروفات حسب مراكز التكلفة لاتخاذ قرارات أدق.", color: "bg-blue-50 text-blue-600" },
];

export default function Services() {
  return (
    <div className="flex flex-col px-8 py-16 gap-16">
      <section className="w-full">
        <GlassCard className="flex flex-col items-center text-center p-12 gap-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 text-2xl">⊞</div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">خدماتنا</h1>
          <p className="text-lg text-gray-500 max-w-2xl leading-relaxed">
            مجموعة متكاملة من الحلول المحاسبية المصممة خصيصاً لتنمية أعمالك
          </p>
        </GlassCard>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {services.map((service) => (
          <GlassCard key={service.title} className="p-8 flex flex-col gap-4 card-hover">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg ${service.color}`}>
              {service.icon}
            </div>
            <h3 className="text-gray-900 font-semibold">{service.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed flex-1">{service.desc}</p>
          </GlassCard>
        ))}
      </section>

      <section className="w-full">
        <GlassCard className="p-10 flex flex-col items-center text-center gap-6">
          <h2 className="text-2xl font-bold text-gray-900">هل تحتاج إلى حل مخصص؟</h2>
          <p className="text-gray-500 max-w-lg leading-relaxed">
            كل مشروع فريد. أخبرنا بما تحتاج وسنقدم لك الحل المناسب
          </p>
          <GlassButton>اتصل بنا</GlassButton>
        </GlassCard>
      </section>
    </div>
  );
}
