import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout({ user, onLogout }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar user={user} onLogout={onLogout} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}