import GlassCard from "@/components/GlassCard";

export default function About() {
  return (
    <div className="flex flex-col px-8 py-16 gap-16">
      <section className="w-full">
        <GlassCard className="flex flex-col items-center text-center p-12 gap-6">
          <div className="w-16 h-16 rounded-2xl bg-[#2563eb] flex items-center justify-center text-white text-2xl font-bold mb-2">A</div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
            عن ACC
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl leading-relaxed">
            نظام محاسبة متكامل صمم خصيصاً لإدارة أعمالك بكل احترافية — فواتير، حسابات، مخزون، وتقارير مالية متقدمة
          </p>
        </GlassCard>
      </section>

      <section className="w-full grid sm:grid-cols-3 gap-6">
        <GlassCard className="p-8 flex flex-col gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-lg font-bold">01</div>
          <h3 className="text-lg font-semibold text-gray-900">رسالتنا</h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            تقديم حلول محاسبية مبتكرة تجمع بين التقنية الحديثة والسهولة في الاستخدام، لتمكين الشركات من النمو والازدهار.
          </p>
        </GlassCard>
        <GlassCard className="p-8 flex flex-col gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-lg font-bold">02</div>
          <h3 className="text-lg font-semibold text-gray-900">رؤيتنا</h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            أن نكون المنصة المحاسبية الرائدة في المنطقة، نضع معايير جديدة للتميز في إدارة الأعمال.
          </p>
        </GlassCard>
        <GlassCard className="p-8 flex flex-col gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-lg font-bold">03</div>
          <h3 className="text-lg font-semibold text-gray-900">قيمنا</h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            الابتكار، الجودة، والدقة في التفاصيل — هذه هي المبادئ التي تقود كل خطوة نخطوها.
          </p>
        </GlassCard>
      </section>

      <section className="w-full">
        <GlassCard className="p-10 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">لماذا ACC؟</h2>
          <p className="text-gray-500 leading-relaxed max-w-3xl mx-auto">
            نظام محاسبة متكامل يدير فواتيرك، مدفوعاتك، حساباتك، ومخزونك بدقة وفي وقت واحد. مع واجهة عربية أصيلة وتقارير متقدمة، ACC هو شريكك الرقمي الأمثل لإدارة أعمالك.
          </p>
        </GlassCard>
      </section>
    </div>
  );
}
