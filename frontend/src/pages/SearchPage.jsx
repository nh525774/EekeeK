// pages/SearchPage.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { theme } from "../constants/theme";
import ScreenWrapper from "../components/ScreenWrapper";
import Header from "../components/Header";
import Button from "../components/Button";

export default function SearchPage() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    const qq = q.trim();
    if (!qq) {
      setUsers([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.get("/api/search", {
        params: { q: qq, type: "users", limit: 20 },
      });
      setUsers(data?.data?.users || []);
    } finally {
      setLoading(false);
    }
  };

  const goProfile = (u) => {
    nav(`/profile/${u.username}`);
  };

  return (
    <ScreenWrapper bg="white">
      <Header title="Search" showBack />
      <div className="min-h-[70vh] bg-gradient-to-br from-background via-muted/30 to-background text-foreground">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* 타이틀 */}
          <h1
            style={{
              fontWeight: theme.fonts.bold,
              fontSize: 20,
              marginBottom: 12,
            }}
            className="text-foreground"
          >
            검색
          </h1>

          {/* 검색 박스 */}
          <form
            onSubmit={onSubmit}
            className="card-glass shadow-soft rounded-2xl p-4 sm:p-5 mb-5"
          >
            <div className="flex gap-2 items-stretch">
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="사용자 아이디를 입력하세요"
                style={{
                  flex: 1,
                  border: `1px solid hsl(var(--border))`,
                  borderRadius: theme.radius.md,
                  padding: "10px 12px",
                  outline: "none",
                  background: "transparent",
                  color: "hsl(var(--foreground))",
                }}
                className="focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="submit"
                style={{
                  border: "1px solid hsl(var(--border))",
                  borderRadius: theme.radius.md,
                  padding: "10px 14px",
                  background: "transparent",
                  color: "hsl(var(--foreground))",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
                className="btn-ghost"
              >
                검색
              </button>
            </div>

            {loading && (
              <p className="mt-3 text-sm text-muted-foreground">검색 중…</p>
            )}
            {!loading && users.length === 0 && q.trim() && (
              <p className="mt-3 text-sm text-muted-foreground">
                일치하는 사용자가 없어요.
              </p>
            )}
          </form>

          {/* 결과 리스트 */}
          <ul className="space-y-2">
            {users.map((u) => (
              <li
                key={u._id}
                onClick={() => goProfile(u)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: theme.radius.lg,
                  cursor: "pointer",
                }}
                className="card-glass shadow-soft hover:bg-muted/40 transition-colors"
              >
                <img
                  src={u.profileImageUrl || "/defaultUser.png"}
                  alt=""
                  width={40}
                  height={40}
                  style={{ borderRadius: "9999px", objectFit: "cover" }}
                  className="shadow-soft"
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: theme.fonts.semibold,
                      color: theme.colors.textDark,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    className="text-foreground"
                  >
                    @{u.username}
                  </div>
                  {u.bio && (
                    <div
                      style={{
                        fontSize: 12,
                        color: theme.colors.textLight,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      className="text-muted-foreground"
                    >
                      {u.bio}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ScreenWrapper>
  );
}
