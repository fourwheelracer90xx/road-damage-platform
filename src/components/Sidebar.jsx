import { NavLink } from "react-router-dom";

const items = [
  ["Dashboard", "/"],
  ["Live Map", "/live-map"],
  ["Potholes", "/potholes"],
  ["Contractors", "/contractors"],
  ["Reports", "/reports"],
  ["Analytics", "/analytics"],
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">RD</div>
        <div>
          <div className="brand-title">Road Damage</div>
          <div className="brand-subtitle">Intelligence Platform</div>
        </div>
      </div>

      <nav className="side-nav">
        {items.map(([label, path]) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}
            className={({ isActive }) =>
              `side-link ${isActive ? "active" : ""}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="side-footer">
        <span className="online-dot" />
        System Online
      </div>
    </aside>
  );
}