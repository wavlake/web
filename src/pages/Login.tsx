import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function Login() {
  const { user } = useCurrentUser();

  return (
    <div className="my-6 space-y-6">
      <h1 className="text-2xl font-bold">
        {user ? `Currently logged in as ${user.pubkey}` : "Login"}
      </h1>
    </div>
  );
}