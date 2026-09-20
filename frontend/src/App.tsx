export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
      <main className="max-w-xl w-full text-center space-y-6">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
          Text-to-Braille Converter
        </h1>
        <p className="text-lg sm:text-xl text-slate-600 leading-relaxed">
          An accessibility-focused tool for converting text into Braille.
        </p>
        <div>
          <button
            type="button"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-blue-600 text-white font-medium text-base hover:bg-blue-700 active:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors shadow-sm cursor-pointer"
          >
            Get Started
          </button>
        </div>
      </main>
    </div>
  )
}
