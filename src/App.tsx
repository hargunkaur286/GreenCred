import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import BorrowerDashboard from "./pages/BorrowerDashboard";
import VerifierDashboard from "./pages/VerifierDashboard";
import LenderDashboard from "./pages/LenderDashboard";
import PassportView from "./pages/PassportView";
import MyPassport from "./pages/MyPassport";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/borrower" element={<BorrowerDashboard />} />
          <Route path="/verifier" element={<VerifierDashboard />} />
          <Route path="/lender" element={<LenderDashboard />} />
          <Route path="/passport" element={<MyPassport />} />
          <Route path="/passport/:id" element={<PassportView />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
