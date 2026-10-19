export function WelcomeBanner() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
      {/* Gradient overlay for text readability */}
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      {/* Welcome copy */}
      <div className="relative p-4 md:p-8 animate-fade-up">
        <h2 className="text-2xl md:text-5xl font-black text-white drop-shadow-lg">
          مرحباً بك في مكانك
        </h2>
        <p className="mt-1 md:mt-3 text-sm md:text-lg font-semibold text-white/85 drop-shadow">
          اكتشف كل متاجر مصر في مكان واحد
        </p>
      </div>
    </div>
  );
}