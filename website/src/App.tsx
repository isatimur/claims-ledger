import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Docs } from "./pages/Docs";
import { Action } from "./pages/Action";
import { Ledgers } from "./pages/Ledgers";
import { Mcp } from "./pages/Mcp";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/action" element={<Action />} />
        <Route path="/ledgers" element={<Ledgers />} />
        <Route path="/mcp" element={<Mcp />} />
      </Routes>
    </Layout>
  );
}
