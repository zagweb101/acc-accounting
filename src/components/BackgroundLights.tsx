export default function BackgroundLights() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[128px]" />
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[128px]" />
      <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-indigo-600/15 rounded-full blur-[128px]" />
    </div>
  );
}
