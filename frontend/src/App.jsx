import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FilesProvider } from "./contexts/FilesContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/home";
import NewPost from "./pages/newPost";
import Notifications from "./pages/notifications";
import Profile from "./pages/profile";
import EditProfile from "./pages/editProfile";
import EditMosaic from "./pages/editMosaic";
import PostDetails from "./pages/postDetails";
import SearchPage from "./pages/SearchPage";
import EekrewList from "./pages/EekrewList";
import DeepfakeFilter from "./pages/DeepfakeFilter";

function App() {
  return (
    <FilesProvider>
      <BrowserRouter>
        {/* ---- 전역 배경 & 글래스 느낌 (기능 변경 없음) ---- */}
        <div className="min-h-screen bg-white text-foreground">
          {/* 중앙 컨테이너: 여백/폭만 조정 (부트스트랩과 충돌 없음) */}
          <main className="w-full h-full mx-0 px-0 py-0">
            {/* 카드/페이지에서 공통으로 살짝 소프트 톤 주고 싶으면 아래 래퍼 이용 */}
            <div className="space-y-6">
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
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
                <Route path="/eekrew" element={<EekrewList />} />
                <Route path="/deepfake-filter" element={<DeepfakeFilter />} />
              </Routes>
            </div>
          </main>
        </div>
      </BrowserRouter>
    </FilesProvider>
  );
}

export default App;
