import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import PharmaciesPage from "./pages/PharmaciesPage";
import PostsPage from "./pages/PostsPage";
import LoginPage from "./pages/LoginPage"; 

function App() {
  return (
    <Router>
      <Navbar />
      <div style={{ padding: "30px" }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/pharmacies" element={<PharmaciesPage />} />
          <Route path="/posts" element={<PostsPage />} />
          <Route path="*" element={<PharmaciesPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
