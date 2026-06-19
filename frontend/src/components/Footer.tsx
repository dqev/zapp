export function Footer() {
  return (
    <footer className="w-full bg-[#09090b] pb-12 px-6 md:px-10 mt-16 select-none overflow-hidden">
      <div className="max-w-[1200px] mx-auto">

        {/* Big Serif branding logo */}
        <div className="pt-8 flex justify-center items-center">
          <span className="font-serif text-[15vw] sm:text-[10vw] md:text-[10rem] font-medium leading-none tracking-tighter text-white/[0.1] select-none lowercase pointer-events-none">
            zapp
          </span>
        </div>

      </div>
    </footer>
  );
}
