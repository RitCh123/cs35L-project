import { Button } from "@heroui/react";
import { Divider } from "@heroui/divider";
import { FcGoogle } from "react-icons/fc";
import { useAuth } from "./firebase/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export const GoogleIcon = () => {
  return <FcGoogle className="h-5 w-5" />;
};

export default function Login() {
  const { googleSignIn } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    try {
      setError("");
      setLoading(true);
      await googleSignIn();
      navigate("/");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex gap-4 items-center"
      style={{
        display: "flex",
        padding: "20px",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      <h1 className="text-xl font-bold"><strong>Sign into Game Reservation</strong></h1>
      <p>Sign in with your UCLA email address (@ucla.edu or @g.ucla.edu) to access the game reservation system.</p>
      {error && <p className="text-red-500">{error}</p>}
      <Divider className="my-4" />
      <Button
        className="w-full"
        color="primary"
        startContent={<GoogleIcon />}
        variant="bordered"
        style={{ width: "25%", alignItems: "center", justifyContent: "center" }}
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        {loading ? "Signing in..." : "Sign in with Google"}
      </Button>
    </div>
  );
}