import { SignIn } from "@clerk/remix";

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bolt-elements-background-depth-1">
      <div className="p-8 bg-bolt-elements-background-depth-2 rounded-xl shadow-lg border border-bolt-elements-borderColor">
        <SignIn routing="path" path="/sign-in" />
      </div>
    </div>
  );
}
