// controllers/searchController.js
const Post = require("../models/Post");
const User = require("../models/User");

function parseIntSafe(v, d) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : d;
}

/**
 * GET /api/search?q=키워드&type=all|posts|users&sort=best|recent&page=1&limit=20
 */
exports.search = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const type = (req.query.type || "all").toLowerCase();
    const sort = (req.query.sort || "best").toLowerCase();
    const page = parseIntSafe(req.query.page, 1);
    const limit = parseIntSafe(req.query.limit, 20);
    const skip = (page - 1) * limit;

    if (!q) {
      return res.json({ success: true, data: { posts: [], users: [] }, meta: { totalPosts: 0, totalUsers: 0 } });
    }

    const postSort = sort === "recent" ? { createdAt: -1 } : { score: { $meta: "textScore" } };
    const userSort = sort === "recent" ? { createdAt: -1 } : { score: { $meta: "textScore" } };

    const tasks = {
      posts: Promise.resolve([]),
      totalPosts: Promise.resolve(0),
      users: Promise.resolve([]),
      totalUsers: Promise.resolve(0),
    };

    if (type === "all" || type === "posts") {
      const postQuery = { $text: { $search: q } };
      tasks.posts = Post.find(postQuery, sort === "recent" ? {} : { score: { $meta: "textScore" } })
        .sort(postSort)
        .skip(skip)
        .limit(limit)
        .populate("userId", "username profileImageUrl") // 최소 필드만
        .lean();

      tasks.totalPosts = Post.countDocuments(postQuery);
    }

    if (type === "all" || type === "users") {
      const userQuery = { $text: { $search: q } };
      tasks.users = User.find(userQuery, sort === "recent" ? {} : { score: { $meta: "textScore" } })
        .sort(userSort)
        .skip(skip)
        .limit(limit)
        .select("username bio profileImageUrl")
        .lean();

      tasks.totalUsers = User.countDocuments(userQuery);
    }

    const [posts, totalPosts, users, totalUsers] = await Promise.all([
      tasks.posts, tasks.totalPosts, tasks.users, tasks.totalUsers,
    ]);

    res.json({
      success: true,
      data: { posts, users },
      meta: { page, limit, totalPosts, totalUsers, type, sort, q },
    });
  } catch (err) {
    console.error("search error:", err);
    res.status(500).json({ success: false, error: "SEARCH_FAILED" });
  }
};
