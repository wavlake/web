import AuthFlow from "@/components/auth/v3/AuthFlow";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLoggedInAccounts } from "@/hooks/useLoggedInAccounts";

export default function Login() {
  // const { user } = useCurrentUser();
  // const { currentUser, removeLogin } = useLoggedInAccounts();
  // return user ? (
  //   <div className="my-6 space-y-6">
  //     <h1 className="text-2xl font-bold">
  //       Currently logged in as {user.pubkey}
  //     </h1>
  //     <Button onClick={() => currentUser && removeLogin(currentUser.id)}>
  //       Sign Out
  //     </Button>
  //   </div>
  // ) : (
  return <AuthFlow />;
  // );
}
