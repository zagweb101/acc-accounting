import GlassCard from "@/components/GlassCard";

export default function About() {
  return (
    <div className="flex flex-col items-center px-8 py-16 gap-16">
      <section className="w-full">
        <GlassCard className="flex flex-col items-center text-center p-12 gap-6">
          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-gray-900">
            About Us
          </h1>
          <p className="text-lg text-gray-600 max-w-xl leading-relaxed">
            We are a team of designers and engineers dedicated to crafting premium digital experiences.
          </p>
        </GlassCard>
      </section>

      <section className="w-full grid sm:grid-cols-2 gap-6">
        <GlassCard className="p-8 flex flex-col gap-4">
          <h2 className="text-2xl font-semibold text-gray-900">Our Mission</h2>
          <p className="text-gray-600 leading-relaxed">
            To deliver exceptional digital products that combine cutting-edge technology with stunning design. We believe in the power of great user experience.
          </p>
        </GlassCard>
        <GlassCard className="p-8 flex flex-col gap-4">
          <h2 className="text-2xl font-semibold text-gray-900">Our Vision</h2>
          <p className="text-gray-600 leading-relaxed">
            To become the leading force in modern web design, setting new standards for what beautiful and functional interfaces can achieve.
          </p>
        </GlassCard>
        <GlassCard className="p-8 flex flex-col gap-4">
          <h2 className="text-2xl font-semibold text-gray-900">Our Values</h2>
          <p className="text-gray-600 leading-relaxed">
            Innovation, quality, and attention to detail drive everything we do. We never compromise on the user experience.
          </p>
        </GlassCard>
        <GlassCard className="p-8 flex flex-col gap-4">
          <h2 className="text-2xl font-semibold text-gray-900">Our Team</h2>
          <p className="text-gray-600 leading-relaxed">
            A passionate group of creative professionals united by a shared commitment to excellence and a love for beautiful design.
          </p>
        </GlassCard>
      </section>

      <section className="w-full">
        <GlassCard className="p-10 text-center">
          <h2 className="text-3xl font-semibold text-gray-900 mb-4">Our Journey</h2>
          <p className="text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Founded with a vision to redefine digital aesthetics, we have grown from a small team of dreamers into a full-service design and development agency. Every project we undertake reflects our unwavering commitment to quality and innovation.
          </p>
        </GlassCard>
      </section>

      <section className="w-full">
        <GlassCard className="p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Team Overview</h2>
          <div className="overflow-hidden rounded-2xl bg-black/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-6 py-4 text-gray-600 font-medium">Name</th>
                  <th className="text-left px-6 py-4 text-gray-600 font-medium">Role</th>
                  <th className="text-left px-6 py-4 text-gray-600 font-medium">Experience</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "Alex Mercer", role: "Lead Designer", exp: "8 years" },
                  { name: "Sarah Chen", role: "Frontend Engineer", exp: "6 years" },
                  { name: "Marcus Johnson", role: "UI/UX Specialist", exp: "5 years" },
                  { name: "Elena Rodriguez", role: "Full-Stack Developer", exp: "7 years" },
                ].map((member, i) => (
                  <tr key={member.name} className={i < 3 ? "border-b border-gray-200" : ""}>
                    <td className="px-6 py-4 text-gray-900">{member.name}</td>
                    <td className="px-6 py-4 text-gray-600">{member.role}</td>
                    <td className="px-6 py-4 text-gray-600">{member.exp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
