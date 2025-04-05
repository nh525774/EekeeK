import React, { useEffect, useState } from "react";
import { getServerStatus } from "./api/api";

function App() {
  const [status, setStatus] = useState("");

  useEffect(() => {
    getServerStatus().then(setStatus);
  }, []);

  return <h1>{status}</h1>;
}

export default App;
