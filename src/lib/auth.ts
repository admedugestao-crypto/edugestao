import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const auth = cache(() => getServerSession(authOptions));

export { signIn, signOut } from "next-auth/react";
