import { useState, useEffect } from "react";
import axios from "axios";
import api from "../api"; 
import Toast from "../components/Toast"; 
import { useNavigate } from "react-router-dom";

function PostsPage() {
  const navigate = useNavigate();
  const [postDate, setPostDate] = useState("");
  const [postMessage, setPostMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingMessage, setSavingMessage] = useState(false);
  const [results, setResults] = useState([]);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 8;

  const [toast, setToast] = useState({ message: "", type: "success", visible: false });
  const [userToken, setUserToken] = useState(localStorage.getItem("token") || "");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    } else {
      fetchPostMessage();
      fetchScheduledPosts();
    }
  }, [navigate]);
  

  const showToast = (message, type = "success") => {
    setToast({ message, type, visible: true });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  async function fetchScheduledPosts() {
    try {
      const res = await axios.get("http://34.32.89.181:5000/api/posts", {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setScheduledPosts(res.data);
    } catch (error) {
      console.error(error);
      showToast("Erreur en récupérant les publications ❌", "error");
    } finally {
      setLoadingHistory(false);
    }
  }
  
  async function fetchPostMessage() {
    try {
      const res = await axios.get("http://34.32.89.181:5000/api/posts/get-post-message", {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setPostMessage(res.data.message || "");
    } catch (error) {
      console.error(error);
      showToast("Erreur en récupérant le message de publication ❌", "error");
    }
  }
  

  const handleGenerate = async () => {
    if (!postDate) {
      showToast("Merci de sélectionner une date ⚠️", "error");
      return;
    }
  
    try {
      setLoading(true);
      setResults([]);
      const res = await axios.post(
        "http://34.32.89.181:5000/api/posts/generate",
        { startDate: postDate },
        { headers: { Authorization: `Bearer ${userToken}` }} 
      );
  
      setResults(res.data.results || []);
      fetchScheduledPosts();
      showToast("Publications générées ✅", "success");
    } catch (error) {
      console.error(error);
      showToast("Erreur lors de la génération ❌", "error");
    } finally {
      setLoading(false);
    }
  };
  

  const handleSaveMessage = async () => {
    if (!postMessage.trim()) {
      showToast("Merci d'écrire un message ⚠️", "error");
      return;
    }
  
    try {
      setSavingMessage(true);
      await axios.post(
        "http://34.32.89.181:5000/api/posts/update-post-message",
        { newMessage: postMessage },
        { headers: { Authorization: `Bearer ${userToken}` }}
      );
      showToast("Message sauvegardé ✅", "success");
    } catch (error) {
      console.error(error);
      showToast("Erreur sauvegarde du message ❌", "error");
    } finally {
      setSavingMessage(false);
    }
  };
  

  const forcePostNow = async (postId) => {
    try {
      await axios.post(
        `http://34.32.89.181:5000/api/posts/force-post/${postId}`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      fetchScheduledPosts();
      showToast("Publication immédiate réussie ✅", "success");
    } catch (error) {
      console.error(error);
      showToast("Erreur publication immédiate ❌", "error");
    }
  };
  

  const cancelScheduledPost = async (postId) => {
    if (!window.confirm("Es-tu sûr de vouloir annuler cette publication ?")) return;
  
    try {
      await axios.delete(
        `http://34.32.89.181:5000/api/posts/cancel/${postId}`,
        { headers: { Authorization: `Bearer ${userToken}` }  }
      );
      fetchScheduledPosts();
      showToast("Publication annulée ✅", "success");
    } catch (error) {
      console.error(error);
      showToast("Erreur lors de l'annulation ❌", "error");
    }
  };
  

  const deleteAllPosts = async () => {
    if (!window.confirm("🛑 Es-tu sûr de vouloir supprimer TOUS les posts ?")) return;
  
    try {
      await axios.delete(
        "http://34.32.89.181:5000/api/posts/delete-all",
        { headers: { Authorization: `Bearer ${userToken}` }}
      );
      fetchScheduledPosts();
      showToast("Tous les posts ont été supprimés ✅", "success");
    } catch (error) {
      console.error(error);
      showToast("Erreur suppression de tous les posts ❌", "error");
    }
  };
  

  function groupPostsByDate(posts) {
    const grouped = {};

    posts.forEach((post) => {
      const date = new Date(post.scheduledDatetime).toLocaleDateString('fr-FR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(post);
    });

    return grouped;
  }

  function determineStatus(post) {
    const now = new Date();
    const postDate = new Date(post.scheduledDatetime);

    if (post.status === "cancelled") return "cancelled";
    if (post.status === "published") return "published";
    if (post.status === "scheduled" && postDate < now) return "archived";
    return "scheduled";
  }

  function filterPosts(posts) {
    if (statusFilter === "all") return posts;
    return posts.filter((post) => determineStatus(post) === statusFilter);
  }

  const filteredPosts = filterPosts([...scheduledPosts]
    .sort((a, b) => new Date(a.scheduledDatetime) - new Date(b.scheduledDatetime)));

  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentPosts = filteredPosts.slice(indexOfFirstPost, indexOfLastPost);

  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const colors = {
    scheduled: "#0d47a1",
    published: "#1b5e20",
    cancelled: "#b71c1c",
    archived: "#424242",
    all: "#212121",
  };

  const getStatusBadge = (status) => {
    const labels = {
      scheduled: "Programmé",
      published: "Publié",
      cancelled: "Annulé",
      archived: "Archivé",
    };
    return (
      <span style={{
        backgroundColor: colors[status],
        color: "white",
        borderRadius: "20px",
        padding: "4px 10px",
        fontSize: "12px",
        marginLeft: "10px",
      }}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="container" style={{ padding: "30px", fontFamily: "Arial, sans-serif", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "30px", marginBottom: "20px", fontWeight: "bold", color: "#212121" }}>📅 Programmation des Publications</h1>

      {/* Generate Posts */}
      <div className="card" style={cardStyle}>
        <h2 style={{ color: "#212121" }}>⚡ Générer de nouvelles publications</h2>
        <input type="date" value={postDate} onChange={(e) => setPostDate(e.target.value)} style={inputStyle} />
        <textarea value={postMessage} onChange={(e) => setPostMessage(e.target.value)} rows="4" placeholder="Message de publication" style={textareaStyle} />
        <div style={{ marginTop: "10px" }}>
          <button onClick={handleSaveMessage} disabled={savingMessage} style={primaryButton}>
            {savingMessage ? "Sauvegarde..." : "💾 Sauvegarder"}
          </button>
          <button onClick={handleGenerate} disabled={loading} style={{ ...primaryButton, marginLeft: "10px" }}>
            {loading ? "Génération..." : "⚡ Générer"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {["all", "scheduled", "published", "cancelled", "archived"].map((status) => (
          <button
            key={status}
            onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
            style={{
              ...pillButton,
              backgroundColor: colors[status],
              color: "white",
              border: statusFilter === status ? "2px solid #000" : "none",
              fontWeight: statusFilter === status ? "bold" : "normal",
            }}
          >
            {status === "all" ? "Tout" : getStatusBadge(status)}
          </button>
        ))}

        {/* Delete All Button */}
        <button onClick={deleteAllPosts} style={{ ...pillButton, backgroundColor: "#b71c1c", color: "white" }}>
          🗑️ Tout Supprimer
        </button>
      </div>

      {/* Scheduled Posts */}
      <div className="card" style={cardStyle}>
        <h2 style={{ color: "#212121" }}>🕑 Historique</h2>

        {loadingHistory ? (
          <p>Chargement...</p>
        ) : currentPosts.length === 0 ? (
          <p>Aucun post trouvé.</p>
        ) : (
          (() => {
            const groupedPosts = groupPostsByDate(currentPosts);

            return Object.keys(groupedPosts).map((date) => (
              <div key={date} style={{ marginBottom: "30px" }}>
                <h3 style={{ marginBottom: "10px", color: "#424242" }}>📅 {date.charAt(0).toUpperCase() + date.slice(1)}</h3>
                <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
                  {groupedPosts[date].map((post) => (
                    <li key={post.id} style={postItemStyle}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", animation: "fadeIn 0.5s ease-in" }}>
                        <div>
                          <strong>{post.pharmacyName || "❓"}</strong> à {new Date(post.scheduledDatetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          {getStatusBadge(determineStatus(post))}
                        </div>
                        {determineStatus(post) === "scheduled" && (
                          <div>
                            <button onClick={() => forcePostNow(post.id)} style={smallButton}>Publier</button>
                            <button onClick={() => cancelScheduledPost(post.id)} style={{ ...smallButton, backgroundColor: "#b71c1c" }}>Annuler</button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ));
          })()
        )}

        {/* Pagination */}
        <div style={{ marginTop: "20px" }}>
          {Array.from({ length: totalPages }, (_, idx) => (
            <button
              key={idx + 1}
              onClick={() => paginate(idx + 1)}
              style={{
                margin: "0 5px",
                padding: "8px 12px",
                backgroundColor: currentPage === idx + 1 ? "#0d47a1" : "#bdbdbd",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Toast Notification */}
      {toast.visible && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </div>
  );
}

// Styles
const cardStyle = {
  padding: "20px",
  backgroundColor: "#e0e0e0",
  borderRadius: "12px",
  marginBottom: "30px",
  boxShadow: "0px 8px 20px rgba(0,0,0,0.08)",
};

const inputStyle = {
  width: "auto",
  padding: "10px",
  marginBottom: "10px",
  borderRadius: "8px",
  border: "1px solid #9e9e9e",
};

const textareaStyle = {
  width: "98.5%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #9e9e9e",
  marginBottom: "10px",
};

const primaryButton = {
  padding: "10px 20px",
  backgroundColor: "#0d47a1",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

const pillButton = {
  padding: "6px 16px",
  borderRadius: "20px",
  marginRight: "10px",
  fontWeight: "bold",
  border: "none",
  cursor: "pointer",
  transition: "background-color 0.3s, transform 0.2s",
};

const postItemStyle = {
  backgroundColor: "#fafafa",
  padding: "12px",
  borderRadius: "8px",
  marginBottom: "10px",
  boxShadow: "0px 2px 5px rgba(0, 0, 0, 0.08)",
};

const smallButton = {
  padding: "5px 10px",
  backgroundColor: "#1b5e20",
  color: "white",
  border: "none",
  borderRadius: "5px",
  marginLeft: "8px",
  cursor: "pointer",
};

export default PostsPage;
