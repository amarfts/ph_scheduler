import { useState, useEffect } from "react";
import axios from "axios";
import api from "../api";
import Toast from "../components/Toast";
import { useNavigate } from "react-router-dom";
import Select from "react-select";

function PharmaciesPage() {
  const navigate = useNavigate();
  const [pharmacies, setPharmacies] = useState([]);
  const [userToken, setUserToken] = useState(localStorage.getItem("token") || "");
  const [facebookToken, setFacebookToken] = useState(localStorage.getItem("facebookToken") || "");
  const [pages, setPages] = useState([]);
  const [toast, setToast] = useState({ message: "", type: "success", visible: false });
  const [showToken, setShowToken] = useState(false);

  const [form, setForm] = useState({
    name: "",
    facebookPageId: "",
    postingDay: "monday",
    postingFrequency: "weekly",
    apiType: "private",
    pharmacyIdForNeighbor: "",
    authToken: "",
    cookieToken: "",
    pageAccessToken: "",
    address: "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    setUserToken(token);
    fetchPharmacies();
    fetchSavedFacebookToken(token);
  }, [navigate]);
  
  const fetchSavedFacebookToken = async (token) => {
    try {
      const res = await axios.get('/api/token/get-token', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.token) {
        setFacebookToken(res.data.token);
      }
    } catch (error) {
      console.warn("⚠️ Token fetch failed or not saved:", error.message);
    }
  };
  
  
  const fetchPharmacies = async () => {
    try {
      const res = await axios.get("/api/pharmacies/list", {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });
      setPharmacies(res.data);
    } catch (error) {
      console.error(error);
      showToast("Erreur chargement pharmacies ❌", "error");
    }
  };

  const fetchAllPages = async (url, accumulated = []) => {
    try {
      const res = await axios.get(url);
      const newPages = res.data.data || [];
      const allPages = accumulated.concat(newPages);

      if (res.data.paging?.next) {
        return fetchAllPages(res.data.paging.next, allPages);
      }
      return allPages;
    } catch (error) {
      console.error("Erreur chargement pages:", error);
      showToast("Erreur chargement pages ❌", "error");
      return [];
    }
  };

  const fetchPages = async () => {
    if (!facebookToken) {
      showToast("Merci de fournir ton token utilisateur Facebook ⚠️", "error");
      return;
    }

    const url = `https://graph.facebook.com/me/accounts?access_token=${facebookToken}`;
    const allPages = await fetchAllPages(url);
    setPages(allPages);
    showToast("Pages chargées ✅", "success");
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFacebookTokenChange = async (e) => {
    const newToken = e.target.value;
    setFacebookToken(newToken);
    localStorage.setItem("facebookToken", newToken);
  
    try {
      await axios.post(
        "/api/token/save-token",
        { token: newToken },
        {
          headers: { Authorization: `Bearer ${userToken}` } // 👈 fixed this line
        }
      );
      showToast("Token Facebook sauvegardé ✅", "success");
    } catch (error) {
      showToast("Erreur sauvegarde token ❌", "error");
    }
  };  
  
  const handleCopyFacebookToken = () => {
    if (facebookToken) {
      navigator.clipboard.writeText(facebookToken);
      showToast("Token Facebook copié ✅", "success");
    } else {
      showToast("Aucun token Facebook à copier ❌", "error");
    }
  };

  const handleSelectPageInForm = (selectedOption) => {
    const selectedPage = pages.find((p) => p.id === selectedOption.value);
    if (selectedPage) {
      setForm({
        ...form,
        facebookPageId: selectedPage.id,
        pageAccessToken: selectedPage.access_token,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.facebookPageId) {
      showToast("Merci de sélectionner une Page Facebook ⚠️", "error");
      return;
    }

    try {
      await axios.post("/api/pharmacies/add", form, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });
      resetForm();
      fetchPharmacies();
      showToast("Pharmacie ajoutée ✅", "success");
    } catch (error) {
      console.error(error);
      showToast("Erreur ajout pharmacie ❌", "error");
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      facebookPageId: "",
      postingDay: "monday",
      postingFrequency: "weekly",
      apiType: "private",
      pharmacyIdForNeighbor: "",
      authToken: "",
      cookieToken: "",
      pageAccessToken: "",
      address: "",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette pharmacie ?")) return;

    try {
      await axios.delete(`/api/pharmacies/delete/${id}`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });
      fetchPharmacies();
      showToast("Pharmacie supprimée ✅", "success");
    } catch (error) {
      console.error(error);
      showToast("Erreur suppression ❌", "error");
    }
  };

  const paginatedPharmacies = pharmacies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const showToast = (message, type = "success") => {
    setToast({ message, type, visible: true });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  return (
    <div className="container" style={{ padding: "30px", backgroundColor: "#f5f5f5", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>
    <h1 style={{ fontSize: "30px", fontWeight: "bold", marginBottom: "30px", color: "#212121" }}>🏥 Gestion des Pharmacies</h1>

    <p style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '12px 20px', borderRadius: '8px', border: '1px solid #ffeeba', marginBottom: '25px' }}>
      📢 <strong>Mise à jour (01/05/2025) :</strong> Pour Publigarde, il suffit maintenant d'entrer <strong>l'adresse</strong> de la pharmacie.
    </p>
    <p style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '12px 20px', borderRadius: '8px', border: '1px solid #ffeeba', marginBottom: '25px' }}>
      📢 <strong>Mise à jour (01/05/2025) :</strong> Pour Pharmagarde, il suffit maintenant d'entrer <strong>l'adresse</strong> de la pharmacie.
    </p>
    <p style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '12px 20px', borderRadius: '8px', border: '1px solid #ffeeba', marginBottom: '25px' }}>
      📢 <strong>Mise à jour (01/05/2025) :</strong> Le jeton facebook est maintenant<strong> chiffré </strong>dans la base de données.
    </p>

      {/* Facebook Connect Section */}
      <div style={cardStyle}>
        <h2 style={{ marginBottom: "15px", color: "#212121" }}>🔑 Connecte ton Compte Facebook</h2>
        <input
          type={showToken ? "text" : "password"}
          value={facebookToken}
          onChange={handleFacebookTokenChange}
          placeholder="Token utilisateur Facebook"
          style={inputStyle}
        />
        <div style={{ marginBottom: "15px" }}>
          <button type="button" onClick={() => setShowToken(!showToken)} style={{ ...primaryButton, marginRight: "10px" }}>
            {showToken ? "Masquer" : "Afficher"} Token
          </button>
          <button type="button" onClick={fetchPages} style={{ ...primaryButton, marginRight: "10px" }}>
            Charger Pages
          </button>
          <button type="button" onClick={handleCopyFacebookToken} style={successButton}>
            Copier Token
          </button>
        </div>
      </div>

      {/* Add Pharmacy Section */}
      <div style={{ ...cardStyle, marginTop: "40px" }}>
        <h2 style={{ marginBottom: "15px", color: "#212121" }}>➕ Ajouter une Pharmacie</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column" }}>
          <input name="name" value={form.name} onChange={handleChange} placeholder="Nom pharmacie" style={inputStyle} required />

          {pages.length > 0 && (
            <Select
              options={pages.map((page) => ({
                value: page.id,
                label: page.name,
              }))}
              onChange={handleSelectPageInForm}
              placeholder="Rechercher une page Facebook..."
              styles={{ container: (base) => ({ ...base, marginBottom: "15px" }) }}
            />
          )}

          <select name="postingDay" value={form.postingDay} onChange={handleChange} style={inputStyle}>
            <option value="monday">Lundi</option>
            <option value="tuesday">Mardi</option>
            <option value="wednesday">Mercredi</option>
            <option value="thursday">Jeudi</option>
            <option value="friday">Vendredi</option>
            <option value="saturday">Samedi</option>
            <option value="sunday">Dimanche</option>
          </select>
          <select name="postingFrequency" value={form.postingFrequency} onChange={handleChange} style={inputStyle}>
            <option value="weekly">Hebdomadaire</option>
            <option value="biweekly">Bimensuel</option>
          </select>
          <select name="apiType" value={form.apiType} onChange={handleChange} style={inputStyle}>
            <option value="public">Publigarde</option>
            <option value="private">Pharmagarde</option>
          </select>
          <>
            <input name="address" value={form.address} onChange={handleChange} placeholder="Adresse complète" style={inputStyle} required />
          </>

          <button type="submit" style={{ ...primaryButton, marginTop: "20px" }}>
            ➕ Ajouter
          </button>
        </form>
      </div>

      {/* Pharmacies List Section */}
      <div style={{ ...cardStyle, marginTop: "40px" }}>
        <h2 style={{ marginBottom: "20px", color: "#212121" }}>📋 Liste des Pharmacies</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Jour</th>
                <th>Fréquence</th>
                <th>API</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPharmacies.map((pharmacy) => (
                <tr key={pharmacy.id}>
                  <td>{pharmacy.name}</td>
                  <td>{pharmacy.postingDay}</td>
                  <td>{pharmacy.postingFrequency}</td>
                  <td>{pharmacy.apiType === "public" ? "🌍 Publigarde" : "🔒 Pharmagarde"}</td>
                  <td>
                    <button style={dangerButton} onClick={() => handleDelete(pharmacy.id)}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: "20px" }}>
          {Array.from({ length: Math.ceil(pharmacies.length / itemsPerPage) }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              style={{
                margin: "2px",
                padding: "8px 12px",
                backgroundColor: currentPage === i + 1 ? "#0d47a1" : "#e0e0e0",
                color: currentPage === i + 1 ? "#fff" : "#000",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Toast Notification */}
      {toast.visible && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}

const cardStyle = {
  padding: "20px",
  backgroundColor: "#e0e0e0",
  borderRadius: "12px",
  boxShadow: "0px 8px 20px rgba(0,0,0,0.08)",
  marginBottom: "30px",
};

const inputStyle = {
  marginBottom: "15px",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #9e9e9e",
  width: "98.5%",
};

const primaryButton = {
  padding: "10px 16px",
  backgroundColor: "#0d47a1",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

const successButton = {
  ...primaryButton,
  backgroundColor: "#2e7d32",
};

const dangerButton = {
  ...primaryButton,
  backgroundColor: "#b71c1c",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
};

export default PharmaciesPage;
