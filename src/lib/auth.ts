import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export function auth() {
  return getServerSession(authOptions);
}

export { signIn, signOut } from "next-auth/react";
