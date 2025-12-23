import { Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Learning from "./pages/Learning";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Learning />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Learning />} />
      </Routes>
      <Toaster position="top-center" richColors duration={1000} />
    </>
  );
}
