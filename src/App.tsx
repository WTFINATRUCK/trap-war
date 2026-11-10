import LandingPage from "@/components/LandingPage";
import PlayDemoPage from "@/components/PlayDemoPage";

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, "");
  return path === "/play" ? <PlayDemoPage /> : <LandingPage />;
}
