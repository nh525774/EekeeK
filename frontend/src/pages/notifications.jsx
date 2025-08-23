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
  if (diff < 3600) return `${Math.floor(diff/60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff/3600)}시간 전`;
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
      if (n.data?.postId) navigate(`/post?postId=${n.data.postId}`);
    } else if (n.type === "follow") {
      if (n.senderId?._id) navigate(`/profile/${n.senderId._id}`);
    }
  };

  return (
    <ScreenWrapper bg="white">
      <Header title="Notifications" showBack />
      <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {loading ? (
          <p style={{ color: theme.colors.textLight }}>불러오는 중…</p>
        ) : items.length === 0 ? (
          <p style={{ color: theme.colors.textLight }}>알림이 없습니다.</p>
        ) : (
          items.map((n) => (
            <div
              key={n._id}
              onClick={() => onClickItem(n)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: theme.radius.xl,
                border: `1px solid ${theme.colors.border}`,
                cursor: "pointer",
              }}
            >
              <Avatar
                uri={n.senderId?.profileImageUrl || "/defaultUser.png"}
                size={48}
                rounded={theme.radius.xl}
              />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: theme.fonts.medium, color: theme.colors.text }}>
                  <span style={{ fontWeight: theme.fonts.semibold }}>
                    {n.senderId?.username || "알 수 없음"}
                  </span>{" "}
                  {n.message}
                </p>
                <p style={{ fontSize: 12, color: theme.colors.textLight }}>
                  {timeAgo(n.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </ScreenWrapper>
  );
};

export default Notifications;
