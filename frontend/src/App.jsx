import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FilesProvider } from "./contexts/FilesContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/home";
import NewPost from "./pages/newPost";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import EditProfile from "./pages/editProfile";
import EditMosaic from "./pages/editMosaic";
import PostDetails from "./pages/postDetails";
import SearchPage from "./pages/SearchPage";

function App() {
  return (
    <FilesProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/home" element={<Home />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/uploadPage" element={<NewPost />} />
          <Route path="/editMosaic" element={<EditMosaic />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          {/* 다른 유저 프로필 */}
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="/editProfile" element={<EditProfile />} />
          <Route path="/post/:id" element={<PostDetails />} />
          <Route path="/postDetail" element={<PostDetails />} />
          <Route path="/postDetails" element={<PostDetails />} />
        </Routes>
      </BrowserRouter>
    </FilesProvider>
  );
}

export default App;
