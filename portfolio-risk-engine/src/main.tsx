import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Mirror the OS dark preference onto the root element so the CSS token
// scopes in index.css resolve; an explicit data-theme set by the in-app
// toggle always wins.
const mq = window.matchMedia("(prefers-color-scheme: dark)");
const syncOsDark = () =>
  document.documentElement.setAttribute("data-osdark", mq.matches ? "1" : "0");
syncOsDark();
mq.addEventListener("change", syncOsDark);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
