import GlassCard from "@/components/GlassCard";

export default function Contact() {
  return (
    <div className="flex flex-col px-8 py-16 gap-16">
      <section className="w-full">
        <GlassCard className="flex flex-col items-center text-center p-12 gap-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 text-2xl">◉</div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">اتصل بنا</h1>
          <p className="text-lg text-gray-500 max-w-xl leading-relaxed">
            فريقنا جاهز للإجابة على استفساراتك على مدار الساعة
          </p>
        </GlassCard>
      </section>

      <section className="w-full grid sm:grid-cols-2 gap-6">
        <GlassCard className="p-8 flex flex-col gap-6">
          <h2 className="text-xl font-semibold text-gray-900">معلومات الاتصال</h2>
          <div className="flex flex-col gap-4">
            {[
              { label: "البريد الإلكتروني", value: "info@acc-software.com", icon: "✉" },
              { label: "الهاتف", value: "+966 11 503 0301", icon: "✆" },
              { label: "الموقع", value: "الرياض، المملكة العربية السعودية", icon: "⌂" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">{item.icon}</div>
                <div>
                  <p className="text-gray-400 text-xs">{item.label}</p>
                  <p className="text-gray-800 text-sm">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
        <GlassCard className="p-8 flex flex-col gap-6">
          <h2 className="text-xl font-semibold text-gray-900">ساعات العمل</h2>
          <div className="flex flex-col gap-4">
            {[
              { day: "الأحد - الخميس", time: "9:00 ص - 6:00 م" },
              { day: "الجمعة", time: "مغلق" },
              { day: "السبت", time: "10:00 ص - 2:00 م" },
            ].map((item) => (
              <div key={item.day} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-gray-800 text-sm">{item.day}</span>
                <span className="text-gray-500 text-sm">{item.time}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>

      <section className="w-full">
        <GlassCard className="p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">الدعم الفني</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            فريق الدعم الفني متاح على مدار الساعة طوال أيام الأسبوع عبر الهاتف والبريد الإلكتروني وواتساب. لا تتردد في التواصل معنا لأي استفسار أو مساعدة.
          </p>
        </GlassCard>
      </section>
    </div>
  );
}
