
import { theme } from "../constants/theme";
import { hp } from "../helpers/common";
import Heart from "../assets/icons/Heart";
import Comment from "../assets/icons/Comment";
import Share from "../assets/icons/Share";


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

const PostCard = ({ item, currentUser }) => {
  const isImage = item?.file?.includes("postImages");
  const isVideo = item?.file?.includes("postVideos");

const likes = item?.likes || [];
const liked = currentUser ? likes.includes(currentUser.uid) : false;


  return (
    <div style={styles.container}>
      {/* header */}
      <div style={styles.header}>
        <div style={styles.userInfo}>
          <img
            src={item?.user?.image || "/default-profile.png"}
            alt="avatar"
            style={styles.avatar}
          />
          <div>
            <p style={styles.username}>{item?.user?.name || "User"}</p>
            <p style={styles.postTime}>{item?.createdAt || "Now"}</p>
          </div>
        </div>
        <span style={{ cursor: "pointer" }}>⋮</span>
      </div>

      {/* body */}
      {item?.body && (
        <div
          style={styles.postBody}
          dangerouslySetInnerHTML={{ __html: item.body }}
        />
      )}

      {/* media */}
      {item?.file && (
        <>
          {isImage && (
            <img
              src={item.file}
              alt="post"
              style={{ ...styles.media, maxHeight: "400px" }}
            />
          )}
          {isVideo && (
            <video src={item.file} controls style={styles.media} />
          )}
        </>
      )}

      {/* footer */}
      <div style={styles.footer}>
        <button style={styles.iconButton}>
          <Heart width={22} height={22} color={liked ? theme.colors.rose : theme.colors.text} strokeWidth={1.6} />
          <span style={styles.count}>{likes.length}</span>
        </button>

        <button style={styles.iconButton}>
          <Comment width={22} height={22} color={theme.colors.textLight} strokeWidth={1.6} />
          <span style={styles.count}>0</span>
        </button>

        <button style={styles.iconButton}>
          <Share width={22} height={22} color={theme.colors.textLight} strokeWidth={1.6} />
        </button>
      </div>
    </div>
  );
};

export default PostCard;
