import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center py-10">
      <h1>Welcome to the placeholder for the new homepage.</h1>
      <div className="flex flex-col gap-2 py-2 w-40">
        <Button onClick={() => navigate("/groups")}>Groups List</Button>
        <Button onClick={() => navigate("/login")}>Login</Button>
        <Button onClick={() => navigate("/dashboard")}>Artist Dashboard</Button>
      </div>
    </div>
  );
}
