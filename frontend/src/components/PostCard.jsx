import { theme } from "../constants/theme";
import { hp } from "../helpers/common";
import Heart from "../assets/icons/Heart";
import Comment from "../assets/icons/Comment";
import Share from "../assets/icons/Share";
import { useState } from "react";
import { deletePostById } from "../services/postService";
import { createPostLike } from "../services/postService";

const styles = {
  container: {
    backgroundColor: "#fff",
    borderRadius: "16px",
    padding: "16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    marginBottom: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    cursor: "pointer"
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
    border: "1px solid #ddd",
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
  postBody: {
    color: "#333",
    fontSize: hp(1.6),
  },
  media: {
    width: "100%",
    borderRadius: "12px",
    objectFit: "cover",
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
  count: {
    fontSize: hp(1.6),
    color: theme.colors.text,
  },
};

const PostCard = ({ item, currentUser, navigate }) => {
  const [showMenu, setShowMenu] = useState(false);
  const isOwner = currentUser?.uid === item.userId;
  const [likeCount, setLikeCount] = useState(item?.likes?.length || 0);
  const [isLiked, setIsLiked] = useState(
  currentUser ? item?.likes?.includes(currentUser.uid) : false
);

const handleLike = async (e) => {
  e.stopPropagation();
  if (!currentUser) return;

  const result = await createPostLike(item._id);
  if (result.success) {
    setIsLiked((prev) => !prev);
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
  } else {
    alert(result.msg || "좋아요 실패");
  }
};

  const handleClick = () => {
    if (navigate && item?._id) {
      navigate(`/postDetail?postId=${item._id}`);
    }
  };

  const handleDelete = async () => {
    const confirm = window.confirm("게시물을 삭제하시겠습니까?")
    if (!confirm) return;

  try {
    await deletePostById(item._id);
    alert("삭제 완료!");
    window.location.reload();
  } catch (err) {
    alert("삭제 실패 : " + err.message);
  }
};

  const renderImages = (urls) => {
    if (!urls || urls.length === 0) return null;

    const count = urls.length;

    if (count === 1) {
      return (
        <img
          src={urls[0]}
          alt="post"
          style={{ ...styles.media, maxHeight: "400px" }}
        />
      );
    }

    if (count === 2) {
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4px",
          }}
        >
          {urls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`img-${i}`}
              style={{
                width: "100%",
                height: "200px",
                objectFit: "cover",
                borderRadius: "12px",
              }}
            />
          ))}
        </div>
      );
    }

    if (count === 3) {
      return (
        <div style={{ display: "grid", gap: "4px" }}>
          <img
            src={urls[0]}
            style={{
              width: "100%",
              height: "200px",
              objectFit: "cover",
              borderRadius: "12px",
            }}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "4px",
            }}
          >
            <img
              src={urls[1]}
              style={{
                width: "100%",
                height: "200px",
                objectFit: "cover",
                borderRadius: "12px",
              }}
            />
            <img
              src={urls[2]}
              style={{
                width: "100%",
                height: "200px",
                objectFit: "cover",
                borderRadius: "12px",
              }}
            />
          </div>
        </div>
      );
    }

    return (
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}
      >
        {urls.slice(0, 4).map((url, i) => (
          <img
            key={i}
            src={url}
            alt={`img-${i}`}
            style={{
              width: "100%",
              height: "200px",
              objectFit: "cover",
              borderRadius: "12px",
            }}
          />
        ))}
      </div>
    );
  };
  return (
    <div style={styles.container} onClick={handleClick}>
      {/* header */}
      <div style={styles.header}>
        <div style={styles.userInfo}>
          <img
            src={item?.user?.image || "/defaultUser.png"}
            alt="avatar"
            style={styles.avatar}
          />
          <div>
            <p style={styles.username}>{item?.user?.name || "User"}</p>
            <p style={styles.postTime}>{item?.createdAt || "Now"}</p>
          </div>
        </div>
        {isOwner && (
          <div style={{ position: "relative" }}>
            <span 
            style={{ cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu((prev) => !prev);
            }}
            >⋮</span>
            {showMenu && (
              <div
              style = {{
                position: "absolute",
                 top: "24px",
                  right: 0,
                  background: "#fff",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                  zIndex: 99,
                  minWidth : "100px",
                  padding: "4px 0",
              }}
              >
              <button
                onClick={handleDelete}
                  style={{
                    padding: "8px 16px",
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
                >
                  삭제
              </button>
              </div>
            )}
            </div>
        )}
      </div>

      {/* body */}
      {item.content && <div style={styles.postBody}>{item.content}</div>}

      {/* media */}
      {item.imageUrls && renderImages(item.imageUrls)}
      {item.videoUrl && (
        <video src={item.videoUrl} controls style={styles.media} />
      )}

      {/* footer */}
      <div style={styles.footer}>
        <button style={styles.iconButton} onClick={handleLike}>
          <Heart
            width={22}
            height={22}
            color={isLiked ? theme.colors.rose : theme.colors.text}
            strokeWidth={1.6}
          />
          <span style={styles.count}>{likeCount}</span>
        </button>

        <button style={styles.iconButton}>
          <Comment
            width={22}
            height={22}
            color={theme.colors.textLight}
            strokeWidth={1.6}
          />
          <span style={styles.count}>0</span>
        </button>

        <button style={styles.iconButton}>
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
