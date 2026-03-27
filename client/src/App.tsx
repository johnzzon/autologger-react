import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import Layout from "./components/Layout";
import DailyView from "./pages/DailyView";
import FlexView from "./pages/FlexView";
import LogResult from "./pages/LogResult";
import HarvestForm from "./pages/HarvestForm";

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? "bg-stone-800 text-white"
            : "text-stone-500 hover:text-stone-800 hover:bg-stone-100"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <nav className="mx-auto max-w-3xl px-6 pt-6 pb-4 flex items-center gap-1">
        <span className="mr-3 text-base font-semibold tracking-tight text-stone-800">Autolog</span>
        <NavItem to="/">Daily</NavItem>
        <NavItem to="/flex">Flex</NavItem>
        <NavItem to="/log-form">Harvest</NavItem>
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
