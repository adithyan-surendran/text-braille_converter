import Converter from './components/Converter.tsx';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between px-3 py-6 sm:px-6 sm:py-8 lg:p-10 font-sans">
      <div className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8">
        {/* Header Section */}
        <header className="text-center space-y-2 sm:space-y-3 pt-2 sm:pt-6">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900">
            Text-to-Braille Converter
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed px-2">
            Convert English text to Braille and Braille back to text.
          </p>
        </header>

        {/* Main Application Area */}
        <main>
          <Converter />
        </main>
      </div>

      {/* Footer Section */}
      <footer className="text-center text-xs text-slate-400 py-6 px-2">
        <p>Text-to-Braille Converter &bull; Grade 1 Unified English Braille</p>
      </footer>
    </div>
  );
}
