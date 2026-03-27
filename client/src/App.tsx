import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Layout from "./components/Layout";
import DailyView from "./pages/DailyView";
import FlexView from "./pages/FlexView";
import LogResult from "./pages/LogResult";
import HarvestForm from "./pages/HarvestForm";

export default function App() {
  return (
    <BrowserRouter>
      <nav className="m-6 flex gap-4 text-sm font-medium text-gray-500">
        <Link to="/" className="hover:text-gray-900">Daily</Link>
        <Link to="/flex" className="hover:text-gray-900">Flex</Link>
        <Link to="/log-form" className="hover:text-gray-900">Harvest</Link>
      </nav>
      <Layout>
        <Routes>
          <Route path="/" element={<DailyView />} />
          <Route path="/flex" element={<FlexView />} />
          <Route path="/log" element={<LogResult />} />
          <Route path="/log-form" element={<HarvestForm />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
