import { useEffect, useState } from "react";

import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { onAuthStateChanged } from "firebase/auth";

import auth from "./firebase/auth";

import {
  loginUser,
  logoutUser,
} from "./firebase/authService";

import {
  getUserProfile,
} from "./firebase/roleService";

/*import {
  startDetectionTicketBridge,
} from "./firebase/detectionTicketService";*/

import Layout from "./components/Layout";

import AdminDashboard from "./pages/AdminDashboard";
import LiveMap from "./pages/LiveMap";
import Potholes from "./pages/Potholes";
import Contractors from "./pages/Contractors";
import Reports from "./pages/Reports";
import Analytics from "./pages/Analytics";

import ContractorDashboard from "./pages/ContractorDashboard";
import CitizenDashboard from "./pages/CitizenDashboard";

const APP_BASE_PATH = import.meta.env.BASE_URL;


const ROLE_NAMES = {
  admin: "Administrator",
  contractor: "Contractor",
  user: "Citizen",
};


function LoadingScreen() {
  return (
    <div className="auth-loading">
      <div className="loading-spinner"></div>

      <strong>
        Loading Road Damage Intelligence...
      </strong>
    </div>
  );
}


function LoginPage({
  role,
  setRole,
  email,
  setEmail,
  password,
  setPassword,
  error,
  loggingIn,
  onLogin,
}) {
  return (
    <div className="login-page">

      <div className="login-card">

        {/* BRAND */}

        <div className="login-brand">

          <div className="login-logo">
            RD
          </div>

          <div>
            <h1>
              Road Damage
            </h1>

            <p>
              Intelligence Platform
            </p>
          </div>

        </div>


        {/* HEADING */}

        <div className="login-heading">

          <h2>
            Welcome back
          </h2>

          <p>
            Select your account type to continue.
          </p>

        </div>


        {/* ROLE SELECTOR */}

        <div className="login-role-selector">

          {Object.entries(ROLE_NAMES).map(
            ([roleId, roleName]) => (

              <button
                key={roleId}
                type="button"
                className={
                  role === roleId
                    ? "role-option active"
                    : "role-option"
                }
                onClick={() => {
                  setRole(roleId);
                }}
              >

                <span className="role-option-icon">

                  {roleId === "admin"
                    ? "A"
                    : roleId === "contractor"
                    ? "C"
                    : "U"}

                </span>

                {roleName}

              </button>

            )
          )}

        </div>


        <div className="selected-role-label">

          Signing in as{" "}

          <strong>
            {ROLE_NAMES[role]}
          </strong>

        </div>


        {/* LOGIN FORM */}

        <form onSubmit={onLogin}>

          <label className="form-label">

            Email

            <input
              type="email"
              value={email}
              placeholder="Enter your email"
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />

          </label>


          <label className="form-label">

            Password

            <input
              type="password"
              value={password}
              placeholder="Enter your password"
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
            />

          </label>


          {error && (
            <div className="login-error">
              {error}
            </div>
          )}


          <button
            type="submit"
            className="login-button"
            disabled={loggingIn}
          >

            {loggingIn
              ? "Signing in..."
              : "Sign In"}

          </button>

        </form>


        <div className="login-footer">

          Road Damage Intelligence ·
          Municipal Monitoring

        </div>

      </div>

    </div>
  );
}


export default function App() {

  const [user, setUser] =
    useState(null);

  const [profile, setProfile] =
    useState(null);

  const [checking, setChecking] =
    useState(true);


  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [role, setRole] =
    useState("contractor");

  const [error, setError] =
    useState("");

  const [loggingIn, setLoggingIn] =
    useState(false);

  /*
  =========================================================
  DETECTION → CONTRACTOR TICKET BRIDGE
  =========================================================
  */

  /*useEffect(() => {

    console.log(
      "Starting detection → contractor ticket bridge..."
    );

    const unsubscribe =
      startDetectionTicketBridge();

    return () => {

      console.log(
        "Stopping detection → contractor ticket bridge..."
      );

      if (unsubscribe) {
        unsubscribe();
      }

    };

  }, []);*/

  /*
  =========================================================
  AUTH STATE LISTENER
  =========================================================
  */

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (currentUser) => {

          if (!currentUser) {

            setUser(null);
            setProfile(null);
            setChecking(false);

            return;
          }


          try {

            console.log(
              "Authenticated UID:",
              currentUser.uid
            );


            const userProfile =
              await getUserProfile(
                currentUser.uid
              );


            console.log(
              "Firebase user profile:",
              userProfile
            );


            if (!userProfile) {

              await logoutUser();

              setError(
                "Authenticated account has no /users profile."
              );

              setUser(null);
              setProfile(null);

              return;
            }


            if (
              userProfile.active === false
            ) {

              await logoutUser();

              setError(
                "This account is inactive."
              );

              setUser(null);
              setProfile(null);

              return;
            }


            setUser(currentUser);
            setProfile(userProfile);

          } catch (error) {

            console.error(
              "Authentication/profile error:",
              error
            );

            await logoutUser()
              .catch(() => {});

            setUser(null);
            setProfile(null);

          } finally {

            setChecking(false);

          }

        }
      );


    return unsubscribe;

  }, []);


  /*
  =========================================================
  LOGIN
  =========================================================
  */

  const handleLogin =
    async (event) => {

      event.preventDefault();

      setError("");
      setLoggingIn(true);


      try {

        const currentUser =
          await loginUser(
            email,
            password
          );


        console.log(
          "LOGIN SUCCESS:",
          currentUser.uid
        );


        const userProfile =
          await getUserProfile(
            currentUser.uid
          );


        if (!userProfile) {

          await logoutUser();

          throw new Error(
            "Login succeeded, but no /users/<UID> profile exists."
          );

        }


        if (
          userProfile.active === false
        ) {

          await logoutUser();

          throw new Error(
            "This account is inactive."
          );

        }


        if (
          userProfile.role !== role
        ) {

          await logoutUser();

          throw new Error(
            `This account is registered as ${
              ROLE_NAMES[userProfile.role] ||
              userProfile.role
            }. Select the correct login type.`
          );

        }


        setUser(currentUser);
        setProfile(userProfile);

      } catch (error) {

        console.error(
          "LOGIN ERROR:",
          error
        );


        if (
          error?.code ===
          "auth/invalid-credential"
        ) {

          setError(
            "Invalid email or password."
          );

        } else {

          setError(
            error?.message ||
            "Unable to sign in."
          );

        }

      } finally {

        setLoggingIn(false);

      }

    };


  /*
  =========================================================
  LOGOUT
  =========================================================
  */

  const handleLogout =
    async () => {

      try {

        await logoutUser();

      } catch (error) {

        console.error(
          "Logout error:",
          error
        );

      }

      setUser(null);
      setProfile(null);

      setEmail("");
      setPassword("");

    };


  /*
  =========================================================
  AUTH CHECK
  =========================================================
  */

  if (checking) {

    return <LoadingScreen />;

  }


  /*
  =========================================================
  LOGIN SCREEN
  =========================================================
  */

  if (!user || !profile) {

    return (

      <LoginPage

        role={role}
        setRole={setRole}

        email={email}
        setEmail={setEmail}

        password={password}
        setPassword={setPassword}

        error={error}

        loggingIn={loggingIn}

        onLogin={handleLogin}

      />

    );

  }


  /*
  =========================================================
  ADMIN ROUTES
  =========================================================
  */

  if (profile.role === "admin") {

    return (

      <BrowserRouter basename={APP_BASE_PATH}>

        <Routes>

          <Route
            element={
              <Layout
                user={user}
                onLogout={handleLogout}
              />
            }
          >

            <Route
              path="/"
              element={
                <AdminDashboard />
              }
            />

            <Route
              path="/live-map"
              element={
                <LiveMap />
              }
            />

            <Route
              path="/potholes"
              element={
                <Potholes />
              }
            />

            <Route
              path="/contractors"
              element={
                <Contractors />
              }
            />

            <Route
              path="/reports"
              element={
                <Reports />
              }
            />

            <Route
              path="/analytics"
              element={
                <Analytics />
              }
            />

            <Route
              path="*"
              element={
                <Navigate
                  to="/"
                  replace
                />
              }
            />

          </Route>

        </Routes>

      </BrowserRouter>

    );

  }


  /*
  =========================================================
  CONTRACTOR ROUTES
  =========================================================
  */

  if (
    profile.role === "contractor"
  ) {

    return (

      <BrowserRouter basename={APP_BASE_PATH}>

        <Routes>

          <Route
            path="*"
            element={

              <ContractorDashboard
                user={user}
                onLogout={handleLogout}
              />

            }
          />

        </Routes>

      </BrowserRouter>

    );

  }


  /*
  =========================================================
  CITIZEN ROUTES
  =========================================================
  */

  if (
    profile.role === "user"
  ) {

    return (

      <BrowserRouter basename={APP_BASE_PATH}>

        <Routes>

          <Route
            path="*"
            element={

              <CitizenDashboard
                user={user}
                onLogout={handleLogout}
              />

            }
          />

        </Routes>

      </BrowserRouter>

    );

  }


  /*
  =========================================================
  UNKNOWN ROLE
  =========================================================
  */

  return (

    <div
      style={{
        padding: "40px",
        textAlign: "center",
      }}
    >

      <h2>
        Unknown account role
      </h2>

      <p>
        The authenticated account does not
        have a valid application role.
      </p>

      <button
        onClick={handleLogout}
      >
        Sign Out
      </button>

    </div>

  );

}