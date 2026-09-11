import { Routes, Route, Link } from 'react-router-dom';
import Phone from './phone/Phone.js';

/** Placeholder de la console (construite au jalon J5). */
function ConsolePlaceholder() {
  return (
    <div className="mx-auto max-w-2xl p-8 text-center">
      <h1 className="mb-2 text-xl font-semibold text-gray-800">Console Nextiaa Voice</h1>
      <p className="text-sm text-gray-500">La console d'administration sera disponible au jalon 5.</p>
      <Link to="/" className="mt-4 inline-block text-nextiaa-orange">
        ← Retour au téléphone
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Phone />} />
      <Route path="/console" element={<ConsolePlaceholder />} />
      <Route path="*" element={<Phone />} />
    </Routes>
  );
}
