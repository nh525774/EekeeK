import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/home";
import SearchPage from "./pages/SearchPage";
import NewPost from "./pages/newPost";
import NotificationPage from "./pages/NotificationPage";
import Profile from "./pages/profile";
import EditProfile from "./pages/editProfile";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/Home" element={<Home />} />
        <Route path="/SearchPage" element={<SearchPage />} />
        <Route path="/UploadPage" element={<NewPost />} />
        <Route path="/notifications" element={<NotificationPage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/editprofile" element={<EditProfile />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
