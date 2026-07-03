import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { isMobileUserAgent } from "@/lib/device";

export default async function Home() {
  const ua = (await headers()).get("user-agent");
  redirect(isMobileUserAgent(ua) ? "/m" : "/dashboard");
}
