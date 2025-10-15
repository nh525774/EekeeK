import React, { createContext, useContext, useState } from "react";

const PostContext = createContext();

export const PostProvider = ({ children }) => {
  const [posts, setPosts] = useState([]);

  const addPost = (newPost) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const removePost = (postId) => {
    setPosts((prev) => prev.filter((post) => post._id !== postId));
  };

  const clearPosts = () => {
    setPosts([]);
  };

  return (
    <PostContext.Provider
      value={{ posts, setPosts, addPost, removePost, clearPosts }}
    >
      {children}
    </PostContext.Provider>
  );
};

export const usePost = () => useContext(PostContext);
