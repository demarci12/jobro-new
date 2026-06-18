export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 bg-slate-200 rounded-lg mb-5" />
      <div className="flex flex-col gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 bg-slate-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
