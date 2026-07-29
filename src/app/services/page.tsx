import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";

const services = [
  {
    icon: "â—ˆ",
    title: "UI/UX Design",
    desc: "Crafting intuitive and visually stunning user interfaces that delight users and drive engagement.",
    color: "text-violet-700 bg-violet-500/20",
  },
  {
    icon: "â—‰",
    title: "Web Development",
    desc: "Building high-performance web applications using the latest technologies and best practices.",
    color: "text-blue-700 bg-blue-500/20",
  },
  {
    icon: "â—‡",
    title: "Brand Identity",
    desc: "Developing cohesive brand identities that communicate your vision and resonate with your audience.",
    color: "text-indigo-300 bg-indigo-500/20",
  },
  {
    icon: "â—‹",
    title: "Mobile Design",
    desc: "Designing elegant mobile experiences that feel native and intuitive on every device.",
    color: "text-violet-700 bg-violet-500/20",
  },
  {
    icon: "â–¡",
    title: "Consulting",
    desc: "Providing expert guidance on design strategy, architecture, and technology selection.",
    color: "text-blue-700 bg-blue-500/20",
  },
  {
    icon: "â–³",
    title: "Prototyping",
    desc: "Creating interactive prototypes to validate ideas quickly and iterate with confidence.",
    color: "text-indigo-300 bg-indigo-500/20",
  },
];

export default function Services() {
  return (
    <div className="flex flex-col items-center px-8 py-16 gap-16">
      <section className="max-w-3xl w-full">
        <GlassCard className="flex flex-col items-center text-center p-12 gap-6">
          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-gray-900">
            Our Services
          </h1>
          <p className="text-lg text-gray-600 max-w-xl leading-relaxed">
            Comprehensive design and development services tailored to elevate your digital presence.
          </p>
        </GlassCard>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full">
        {services.map((service) => (
          <GlassCard key={service.title} className="p-8 flex flex-col gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${service.color}`}>
              {service.icon}
            </div>
            <h3 className="text-gray-900 font-semibold text-lg">{service.title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed flex-1">{service.desc}</p>
          </GlassCard>
        ))}
      </section>

      <section className="max-w-5xl w-full">
        <GlassCard className="p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Pricing Plans</h2>
          <div className="overflow-hidden rounded-2xl bg-black/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 backdrop-blur-xl">
                  <th className="text-left px-6 py-4 text-gray-600 font-medium">Plan</th>
                  <th className="text-left px-6 py-4 text-gray-600 font-medium">Features</th>
                  <th className="text-left px-6 py-4 text-gray-600 font-medium">Timeline</th>
                  <th className="text-left px-6 py-4 text-gray-600 font-medium">Price</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { plan: "Starter", features: "UI Audit + 3 Pages", timeline: "2 weeks", price: "$2,499" },
                  { plan: "Growth", features: "UI/UX Design + Development", timeline: "6 weeks", price: "$7,999" },
                  { plan: "Enterprise", features: "Full Brand + Web App", timeline: "12 weeks", price: "$19,999" },
                ].map((row, i) => (
                  <tr key={row.plan} className={i < 2 ? "border-b border-gray-200" : ""}>
                    <td className="px-6 py-4 text-gray-900 font-medium">{row.plan}</td>
                    <td className="px-6 py-4 text-gray-600">{row.features}</td>
                    <td className="px-6 py-4 text-gray-600">{row.timeline}</td>
                    <td className="px-6 py-4 text-gray-900">{row.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </section>

      <section className="max-w-3xl w-full">
        <GlassCard className="p-10 flex flex-col items-center text-center gap-6">
          <h2 className="text-3xl font-semibold text-gray-900">Need a Custom Solution?</h2>
          <p className="text-gray-600 max-w-lg leading-relaxed">
            Every project is unique. Let us know what you need and we will create a tailored solution just for you.
          </p>
          <GlassButton>Contact Us</GlassButton>
        </GlassCard>
      </section>
    </div>
  );
}
