export default function Topbar({ user, onLogout, title = "Administrator Dashboard" }) {
  const name =
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Administrator";

  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        <p>Road damage response management</p>
      </div>

      <div className="topbar-user">
        <div className="avatar">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="topbar-user-text">
          <strong>{name}</strong>
          <span>Administrator</span>
        </div>
        <button className="logout-button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}