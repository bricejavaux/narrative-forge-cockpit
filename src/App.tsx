import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "./components/layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import CanonPage from "./pages/CanonPage";
import CharactersPage from "./pages/CharactersPage";
import ArchitecturePage from "./pages/ArchitecturePage";
import AgentsPage from "./pages/AgentsPage";
import RunsPage from "./pages/RunsPage";
import DiagnosticsPage from "./pages/DiagnosticsPage";
import AudioPage from "./pages/AudioPage";
import AssetsPage from "./pages/AssetsPage";
import IndexesPage from "./pages/IndexesPage";
import ExportsPage from "./pages/ExportsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/canon" element={<CanonPage />} />
            <Route path="/characters" element={<CharactersPage />} />
            <Route path="/architecture" element={<ArchitecturePage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/runs" element={<RunsPage />} />
            <Route path="/diagnostics" element={<DiagnosticsPage />} />
            <Route path="/audio" element={<AudioPage />} />
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/indexes" element={<IndexesPage />} />
            <Route path="/exports" element={<ExportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
