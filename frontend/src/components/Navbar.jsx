import { Link, useLocation } from "react-router-dom";

function Navbar() {
  const location = useLocation();
  const token = localStorage.getItem("token"); 

  return (
    <nav style={styles.nav}>
      <div style={styles.logo}>COMPharmaScheduler</div>

      <div style={styles.links}>
        {token && (
          <>
            <NavLink to="/pharmacies" label="Pharmacies" active={location.pathname.includes("pharmacies")} />
            <NavLink to="/posts" label="Publications" active={location.pathname.includes("posts")} />
          </>
        )}

        {token && (
          <button
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/login";
            }}
            style={{
              backgroundColor: "#b71c1c",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "8px 16px",
              cursor: "pointer",
            }}
          >
            🚪 Déconnexion
          </button>
        )}
      </div>
    </nav>
  );
}

function NavLink({ to, label, active }) {
  return (
    <Link 
      to={to}
      style={{
        ...styles.link,
        borderBottom: active ? "2px solid #ffffff" : "2px solid transparent",
        backgroundColor: active ? "#1565c0" : "transparent",
        borderRadius: "20px",
        padding: "8px 16px",
        transition: "all 0.3s ease",
      }}
    >
      {label}
    </Link>
  );
}

const styles = {
  nav: {
    backgroundColor: "#0d47a1",
    color: "white",
    padding: "12px 30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "18px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    position: "sticky",
    top: 0,
    zIndex: 1000,
  },
  logo: {
    fontWeight: "bold",
    fontSize: "24px",
    letterSpacing: "1px",
  },
  links: {
    display: "flex",
    gap: "20px",
    alignItems: "center",
  },
  link: {
    color: "white",
    textDecoration: "none",
    fontWeight: "bold",
    fontSize: "16px",
    paddingBottom: "5px",
    transition: "all 0.3s ease",
  },
};

export default Navbar;
