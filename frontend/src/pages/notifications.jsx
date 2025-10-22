import React, { useEffect, useState } from "react";
import { getMyNotifications } from "../services/notificationService";
import { useNavigate } from "react-router-dom";
import ScreenWrapper from "../components/ScreenWrapper";
import Header from "../components/Header";
import { theme } from "../constants/theme";
import Avatar from "../components/Avatar";

function timeAgo(ts) {
  const d = new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return d.toLocaleString();
}

const Notifications = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const list = await getMyNotifications();
        setItems(list);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onClickItem = (n) => {
    if (n.type === "post_like" || n.type === "post_comment") {
      if (n.data?.postId) navigate(`/postDetail?postId=${n.data.postId}`);
    } else if (n.type === "follow") {
      if (n.senderId?._id) navigate(`/profile/${n.senderId._id}`);
    }
  };

  return (
    <ScreenWrapper bg="white">
      <Header title="Notifications" showBack />
      <div className="min-h-[70vh] bg-gradient-to-br from-background via-muted/30 to-background text-foreground">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {loading ? (
            <p className="text-muted-foreground">불러오는 중…</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground">알림이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {items.map((n) => (
                <div
                  key={n._id}
                  onClick={() => onClickItem(n)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 16px",
                    borderRadius: theme.radius.xl,
                    cursor: "pointer",
                  }}
                  className="card-glass shadow-soft border border-border hover:bg-muted/40 transition-colors"
                >
                  <Avatar
                    uri={n.senderId?.profileImageUrl || "/defaultUser.png"}
                    size={48}
                    rounded={theme.radius.xl}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontWeight: theme.fonts.medium,
                        color: theme.colors.text,
                      }}
                      className="text-foreground"
                    >
                      <span style={{ fontWeight: theme.fonts.semibold }}>
                        {n.senderId?.username || "알 수 없음"}
                      </span>{" "}
                      {n.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ScreenWrapper>
  );
};

export default Notifications;
