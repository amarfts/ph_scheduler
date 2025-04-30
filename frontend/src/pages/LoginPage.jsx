import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function LoginPage() {
  const [username, setUsername] = useState(""); 
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post("http://34.32.89.181/api/auth/login", { username, password });

      localStorage.setItem("token", res.data.token);

      navigate("/pharmacies"); 
    } catch (err) {
      console.error(err);
      setError("Identifiants invalides ❌");
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={{ marginBottom: "20px", fontSize: "28px", color: "#0d47a1" }}>🔐 Connexion</h2>

        {error && <p style={{ color: "red", marginBottom: "15px" }}>{error}</p>}

        <form onSubmit={handleSubmit} style={formStyle}>
          <input
            type="text"
            placeholder="Nom d'utilisateur"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
          <button type="submit" style={buttonStyle}>Connexion</button>
        </form>
      </div>
    </div>
  );
}

const containerStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100vh",
  backgroundColor: "#f5f5f5",
};

const cardStyle = {
  backgroundColor: "white",
  padding: "40px",
  borderRadius: "16px",
  boxShadow: "0px 8px 30px rgba(0, 0, 0, 0.15)",
  width: "400px", 
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  width: "100%",
};

const inputStyle = {
  padding: "15px",
  borderRadius: "10px",
  border: "1px solid #ccc",
  fontSize: "16px",
};

const buttonStyle = {
  padding: "15px",
  backgroundColor: "#0d47a1",
  color: "white",
  border: "none",
  borderRadius: "10px",
  fontSize: "18px",
  cursor: "pointer",
  transition: "background-color 0.3s",
};

export default LoginPage;
