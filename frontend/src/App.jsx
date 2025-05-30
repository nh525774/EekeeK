import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MainPage from "./pages/MainPage";
import SearchPage from "./pages/SearchPage";
import UploadPage from "./pages/UploadPage";
import NotificationPage from "./pages/NotificationPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/MainPage" element={<MainPage />} />
        <Route path="/SearchPage" element={<SearchPage />} />
        <Route path="/UploadPage" element={<UploadPage />} />
        <Route path="/notifications" element={<NotificationPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
