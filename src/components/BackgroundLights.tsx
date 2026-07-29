export default function BackgroundLights() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[128px]" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/8 rounded-full blur-[128px]" />
    </div>
  );
}
