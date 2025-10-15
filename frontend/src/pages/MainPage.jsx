import ListGroup from "../components/ListGroup";
import { onAuthStateChanged } from "firebase/auth";
import Sidebar from "../components/Sidebar";
import { auth } from "../api/firebase"; 
import PostCard from "../components/PostCard";
import { useState, useEffect } from "react";
import { fetchPosts } from "../services/postService";

function MainPage() {
  console.log("📦 MainPage 렌더 시작");
  const [posts, setPosts] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("🧑‍🚀 사용자 감지됨:", firebaseUser);
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

    useEffect(() => {
    const load = async () => {
      console.log("게시글 불러오기 시작");
      const res = await fetchPosts();
      if (res.success && Array.isArray(res.data)) {
        console.log("게시글 불러오기 성공:", res.data);
        setPosts(res.data);
      } else {
        console.warn(" 게시글 오류:", res);
        setPosts([]); // fallback
      }
    };
    load();
  }, []);

  if (!user) return <div className="p-4">로그인 사용자 정보를 불러오는 중...</div>;

  return (
    <div className="min-h-screen bg-white">
      <main className="flex">
        <aside className="h-screen w-24 border-r bg-blue shrink-0">
          <Sidebar />
        </aside>
        <section className="flex-1">
          <div className="border-b p-3">
            <h1 className="text-2xl font-bold flex justify-center">EekeeK</h1>
          </div>
          <div className="flex justify-center">
            <div className="w-full max-w-xl p-4 space-y-6">
              {/* 게시글 카드 출력 */}
              {posts.map((post, idx) => (
                <PostCard key={idx} item={post} currentUser={user} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default MainPage;
