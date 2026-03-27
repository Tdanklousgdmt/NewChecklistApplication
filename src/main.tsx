
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { AppSessionProvider } from "./app/context/AppSessionContext.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <AppSessionProvider>
    <App />
  </AppSessionProvider>,
);
  