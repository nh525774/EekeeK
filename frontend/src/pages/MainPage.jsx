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
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      console.log("게시글 불러오기 시작(사용자 준비됨)");
      const res = await fetchPosts();
      if (cancelled) return;
      if (res.success && Array.isArray(res.data)) {
        setPosts(res.data);
      } else {
        console.warn("게시글 오류:", res);
        setPosts([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user)
    return <div className="p-4">로그인 사용자 정보를 불러오는 중...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background text-foreground">
      <main className="flex">
        {/* 사이드바 */}
        <aside className="h-screen w-24 border-r border-border bg-muted/20 shrink-0 header-blur">
          <Sidebar />
        </aside>

        {/* 메인 피드 */}
        <section className="flex-1">
          <div className="border-b border-border p-3 header-blur">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              EekeeK
            </h1>
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-xl p-4 sm:p-6 space-y-6">
              <div className="card-glass shadow-soft border-gradient rounded-2xl p-4 sm:p-6">
                {/* 게시글 카드 출력 */}
                {posts.map((post) => (
                  <PostCard key={post._id} item={post} currentUser={user} />
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default MainPage;
