import ListGroup from "../components/ListGroup";
import Sidebar from "../components/Sidebar";
import { auth } from "../api/firebase"; 
import PostCard from "../components/PostCard";
import { useState, useEffect } from "react";
import { fetchPosts } from "../services/postService";

function MainPage() {
  const [posts, setPosts] = useState([]);
  const user = auth.currentUser;

  useEffect(() => {
    const load = async () => {
      const res = await fetchPosts();
      if (res.success) setPosts(res.data);
    };
    load();
  }, []);

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
