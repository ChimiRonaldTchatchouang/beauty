import { Routes, Route } from 'react-router-dom';
import Phone from './phone/Phone.js';
import Console from './console/Console.js';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Phone />} />
      <Route path="/console/*" element={<Console />} />
      <Route path="*" element={<Phone />} />
    </Routes>
  );
}
