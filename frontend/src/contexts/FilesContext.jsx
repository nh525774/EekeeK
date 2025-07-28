/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from "react";

const FilesContext = createContext();

export const FilesProvider = ({ children }) => {
  const [files, setFiles] = useState([]);
  return (
    <FilesContext.Provider value={{ files, setFiles }}>
      {children}
    </FilesContext.Provider>
  );
};

export const useFiles = () => useContext(FilesContext);

export default FilesProvider;
