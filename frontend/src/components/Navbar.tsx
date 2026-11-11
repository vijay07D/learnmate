import { Link, useLocation } from "react-router-dom";
import { useSession } from "../hooks/useSession";

export default function Navbar() {
  const { session, isDemoMode } = useSession();
  const location = useLocation();
  const active = (path: string) => location.pathname === path ? "active" : "";

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          <span>🎓</span> LearnMate
        </Link>
        <div className="navbar-links">
          {isDemoMode && <span className="demo-badge">⚠ Demo Mode</span>}
          {session && (
            <>
              <Link to="/chat" className={active("/chat")}>Chat</Link>
              <Link to="/dashboard" className={active("/dashboard")}>Dashboard</Link>
              <Link to="/careers" className={active("/careers")}>Careers</Link>
              <Link to="/roadmap" className={active("/roadmap")}>Roadmap</Link>
              <Link to="/profile" className={active("/profile")}>Profile</Link>
            </>
          )}
          {!session && <Link to="/chat" className="btn btn-primary btn-sm">Get Started</Link>}
        </div>
      </div>
    </nav>
  );
}
