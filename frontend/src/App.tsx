import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Chat from "./pages/Chat";
import Dashboard from "./pages/Dashboard";
import CareerExplore from "./pages/CareerExplore";
import RoadmapPage from "./pages/RoadmapPage";
import ProfilePage from "./pages/ProfilePage";
import { useSession } from "./hooks/useSession";

export default function App() {
  const { session } = useSession();
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/dashboard" element={session ? <Dashboard /> : <Navigate to="/" replace />} />
        <Route path="/careers" element={session ? <CareerExplore /> : <Navigate to="/" replace />} />
        <Route path="/roadmap" element={session ? <RoadmapPage /> : <Navigate to="/" replace />} />
        <Route path="/profile" element={session ? <ProfilePage /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
