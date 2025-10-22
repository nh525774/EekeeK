import axios from "axios";
import { auth } from "../api/firebase";
import { theme } from "../constants/theme";
import { hp } from "../helpers/common";
import Heart from "../assets/icons/Heart";
import Comment from "../assets/icons/Comment";
import Share from "../assets/icons/Share";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { deletePostById, createPostLike } from "../services/postService";
import { getUserImageSrc } from "../services/imageService";

const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
const toAbs = (u) =>
  typeof u === "string" && !u.startsWith("http") ? baseUrl + u : u;

const styles = {
  container: {
    backgroundColor: "transparent",
    borderRadius: "16px",
    padding: "16px",
    marginBottom: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    cursor: "pointer",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  avatar: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: "50%",
    objectFit: "cover",
    border: "1px solid hsl(var(--border))",
  },
  username: {
    fontSize: hp(1.7),
    fontWeight: theme.fonts.medium,
    color: theme.colors.textDark,
    margin: 0,
  },
  postTime: {
    fontSize: hp(1.4),
    color: theme.colors.textLight,
    margin: 0,
  },
  postBody: { color: "hsl(var(--foreground))", fontSize: hp(1.6) },

  // ✅ 정사각형 슬롯: 이미지/비디오를 같은 비율로
  squareSlot: {
    position: "relative",
    width: "100%",
    aspectRatio: "1 / 1",
    overflow: "hidden",
    borderRadius: 12,
    background: "#eee",
  },
  squareMedia: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
    display: "block",
  },

  // 단일 미디어 컨테이너 (정사각형 유지)
  singleWrap: {
    width: "100%",
  },

  footer: {
    display: "flex",
    alignItems: "center",
    gap: "24px",
    marginTop: "4px",
  },
  iconButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  count: { fontSize: hp(1.6), color: theme.colors.text },
};

const PostCard = ({
  item,
  currentUser,
  navigate,
  showMoreIcon = true,
  meId,
}) => {
  const nav = navigate || useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [likeCount, setLikeCount] = useState(item?.likes?.length || 0);
  const [isLiked, setIsLiked] = useState(
    currentUser ? item?.likes?.includes(currentUser.uid) : false
  );

  const ownerId =
    item?.userId || item?.user?._id || item?.user?.userId || item?.user?.id;
  const isOwner = meId && ownerId && String(ownerId) === String(meId);
  const u = item?.user || {};
  const userName = u.username || u.name || "User";
  const userImage = getUserImageSrc(
    u.profileImageUrl || u.image || "/defaultUser.png"
  );
  const postDate = item?.createdAt
    ? new Date(item.createdAt).toLocaleDateString()
    : "Now";

  const goProfile = (e) => {
    e.stopPropagation();
    if (u?.username) return nav(`/profile/${u.username}`);
    if (ownerId) return nav(`/profile/${ownerId}`);
    nav(`/profile`);
  };

  const openPostDetails = () => {
    if (item?._id) nav(`/postDetail?postId=${item._id}`);
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!currentUser) return;

    const result = await createPostLike(item._id);
    if (result.success) {
      setIsLiked((prev) => !prev);
      setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
      if (!isLiked && item?.userId) {
        await axios.post(
          "/api/notifications",
          {
            receiverId: item.userId,
            message: "회원님 게시물을 좋아했습니다.",
            type: "post_like",
            data: { postId: item._id },
          },
          {
            headers: {
              Authorization: `Bearer ${await auth.currentUser.getIdToken()}`,
            },
          }
        );
      }
    } else {
      alert(result.msg || "좋아요 실패");
    }
  };

  const handleClick = () => {
    if (item?._id) nav(`/postDetail?postId=${item._id}`);
  };

  const handleDelete = async () => {
    const confirmDelete = window.confirm("게시물을 삭제하시겠습니까?");
    if (!confirmDelete) return;
    try {
      await deletePostById(item._id);
      alert("삭제 완료!");
      window.location.reload();
    } catch (err) {
      alert("삭제 실패 : " + err.message);
    }
  };

  const isVideoUrl = (u) =>
    typeof u === "string" && /\.(mp4|webm|ogg)(\?.*)?$/i.test(u);

  // ✅ 모든 미디어를 정사각형으로 렌더링
  const renderMedia = (urls = []) => {
    if (!urls || urls.length === 0) return null;

    // 1개일 때도 정사각형
    if (urls.length === 1) {
      const url = toAbs(urls[0]);
      const isVideo = isVideoUrl(url);
      return (
        <div style={styles.singleWrap}>
          <div style={styles.squareSlot} className="shadow-soft">
            {isVideo ? (
              <video
                key={url}
                src={url}
                preload="metadata"
                playsInline
                muted
                loop
                autoPlay
                crossOrigin="anonymous"
                style={styles.squareMedia}
                onError={() => {}}
              />
            ) : (
              <img
                src={url}
                alt=""
                style={styles.squareMedia}
                onError={() => {}}
              />
            )}
            {isVideo && (
              <span
                style={{
                  position: "absolute",
                  left: 8,
                  bottom: 8,
                  fontSize: 10,
                  background: "rgba(0,0,0,0.55)",
                  color: "#fff",
                  padding: "2px 6px",
                  borderRadius: 6,
                  pointerEvents: "none",
                }}
              >
                VIDEO
              </span>
            )}
          </div>
        </div>
      );
    }

    // 2개 이상: 2열 정사각형 그리드
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
        }}
      >
        {urls.map((u, i) => {
          const url = toAbs(u);
          const isVideo = isVideoUrl(url);
          return (
            <div key={i} style={styles.squareSlot} className="shadow-soft">
              {isVideo ? (
                <video
                  src={url}
                  preload="metadata"
                  playsInline
                  muted
                  loop
                  autoPlay
                  crossOrigin="anonymous"
                  style={styles.squareMedia}
                  onError={() => {}}
                />
              ) : (
                <img src={url} alt="" style={styles.squareMedia} />
              )}
              {isVideo && (
                <span
                  style={{
                    position: "absolute",
                    left: 6,
                    bottom: 6,
                    fontSize: 10,
                    background: "rgba(0,0,0,0.55)",
                    color: "#fff",
                    padding: "2px 6px",
                    borderRadius: 6,
                    pointerEvents: "none",
                  }}
                >
                  VIDEO
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      style={styles.container}
      onClick={handleClick}
      className="card-glass shadow-soft border-gradient rounded-2xl p-4 sm:p-6 transition hover:shadow-lg"
    >
      {/* header */}
      <div style={styles.header}>
        <div style={styles.userInfo}>
          <button
            onClick={goProfile}
            style={{ all: "unset", cursor: "pointer" }}
          >
            <img
              src={userImage}
              alt="avatar"
              style={styles.avatar}
              className="shadow-soft"
            />
          </button>
          <button
            onClick={goProfile}
            style={{ all: "unset", cursor: "pointer" }}
          >
            <p style={styles.username} className="text-foreground">
              {userName}
            </p>
            <p style={styles.postTime} className="text-muted-foreground">
              {postDate}
            </p>
          </button>
        </div>

        {isOwner && showMoreIcon && (
          <div style={{ position: "relative" }}>
            <span
              style={{ cursor: "pointer" }}
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu((prev) => !prev);
              }}
              className="btn-ghost rounded-md px-2"
              title="more"
            >
              ⋮
            </span>
            {showMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "28px",
                  right: 0,
                  zIndex: 99,
                  minWidth: "120px",
                }}
                className="card-glass shadow-soft rounded-xl border border-border overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleDelete}
                  style={{
                    padding: "10px 14px",
                    background: "none",
                    border: "none",
                    display: "flex",
                    textAlign: "left",
                    justifyContent: "center",
                    alignItems: "center",
                    width: "100%",
                    height: "40px",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                  className="hover:bg-muted/40"
                >
                  삭제
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* body */}
      {item.content && (
        <div style={styles.postBody} className="leading-relaxed">
          {item.content}
        </div>
      )}

      {/* media */}
      {(() => {
        const urls = [
          ...(item.imageUrls || []),
          ...(item.videoUrl ? [item.videoUrl] : []),
        ];
        return renderMedia(urls);
      })()}

      {/* footer */}
      <div style={styles.footer}>
        <button
          style={styles.iconButton}
          onClick={handleLike}
          className="btn-ghost rounded-xl px-2"
        >
          <Heart
            width={22}
            height={22}
            color={isLiked ? theme.colors.rose : theme.colors.text}
            strokeWidth={1.6}
          />
          <span style={styles.count}>{likeCount}</span>
        </button>

        <button
          style={styles.iconButton}
          onClick={openPostDetails}
          className="btn-ghost rounded-xl px-2"
        >
          <Comment
            width={22}
            height={22}
            color={theme.colors.textLight}
            strokeWidth={1.6}
          />
          <span style={styles.count}>{item.comments?.length || 0}</span>
        </button>

        <button style={styles.iconButton} className="btn-ghost rounded-xl px-2">
          <Share
            width={22}
            height={22}
            color={theme.colors.textLight}
            strokeWidth={1.6}
          />
        </button>
      </div>
    </div>
  );
};

export default PostCard;
