export default function BackgroundLights() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-50 rounded-full blur-[128px]" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-50/60 rounded-full blur-[128px]" />
    </div>
  );
}
