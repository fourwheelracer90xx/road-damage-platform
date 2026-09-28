import { useState } from "react";
import { loginUser, logoutUser } from "./firebase/authService";
import {
  addTestPothole,
  getPotholes,
} from "./firebase/firestoreService";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [potholes, setPotholes] = useState([]);

  const handleLogin = async () => {
    try {
      const loggedInUser = await loginUser(email, password);

      setUser(loggedInUser);
      setMessage(`Logged in as ${loggedInUser.email}`);
    } catch (error) {
      console.error(error);
      setMessage(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();

      setUser(null);
      setPotholes([]);
      setMessage("Logged out successfully");
    } catch (error) {
      console.error(error);
      setMessage(error.message);
    }
  };

  const handleAddPothole = async () => {
    try {
      const id = await addTestPothole();

      setMessage(`Pothole added successfully. ID: ${id}`);
    } catch (error) {
      console.error(error);
      setMessage(`Error: ${error.message}`);
    }
  };

  const handleLoadPotholes = async () => {
    try {
      const data = await getPotholes();

      setPotholes(data);
      setMessage(`${data.length} pothole(s) loaded`);
    } catch (error) {
      console.error(error);
      setMessage(`Error: ${error.message}`);
    }
  };

  return (
    <div
      style={{
        padding: "40px",
        maxWidth: "700px",
        margin: "auto",
      }}
    >
      <h1>Road Damage Intelligence</h1>

      <h2>Firebase Test</h2>

      {!user ? (
        <>
          <h3>Login</h3>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              padding: "10px",
              marginBottom: "10px",
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              padding: "10px",
              marginBottom: "10px",
            }}
          />

          <button onClick={handleLogin}>
            Login
          </button>
        </>
      ) : (
        <>
          <p>
            <strong>Logged in:</strong> {user.email}
          </p>

          <button onClick={handleAddPothole}>
            Add Test Pothole
          </button>

          <button
            onClick={handleLoadPotholes}
            style={{ marginLeft: "10px" }}
          >
            Load Potholes
          </button>

          <button
            onClick={handleLogout}
            style={{ marginLeft: "10px" }}
          >
            Logout
          </button>
        </>
      )}

      <p style={{ marginTop: "20px" }}>
        {message}
      </p>

      <hr />

      <h3>Firestore Data</h3>

      {potholes.map((pothole) => (
        <div key={pothole.id}>
          <p>
            <strong>ID:</strong> {pothole.id}
          </p>

          <p>
            Location: {pothole.latitude}, {pothole.longitude}
          </p>

          <p>
            Severity: {pothole.severity}
          </p>

          <p>
            Depth: {pothole.depth} cm
          </p>

          <hr />
        </div>
      ))}
    </div>
  );
}

export default App;