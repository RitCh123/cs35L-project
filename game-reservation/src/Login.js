import { Button } from "@heroui/react";
import { Divider } from "@heroui/divider";

import { FcGoogle } from "react-icons/fc";

export const GoogleIcon = ({
  fill = "currentColor",
  size,
  height,
  width,
  ...props
}) => {
  return <FcGoogle className="h-5 w-5" />;
};

export default function App() {
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
      <p>Choose one of the sign in options and log in. Only available for UCLA students (must register using a UCLA student email address).</p>
      <Divider className="my-4" />
      <Button
        className="w-full"
        color="primary"
        startContent={<GoogleIcon />}
        variant="bordered"
        style={{ width: "25%", alignItems: "center", justifyContent: "center" }}
      >
        Sign in with Google
      </Button>
    </div>
  );
}
