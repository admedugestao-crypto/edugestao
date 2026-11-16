import { headers } from "next/headers";
import CalendarioWeb from "@/components/CalendarioWeb";
import { isMobileUserAgent } from "@/lib/device";

export const dynamic = "force-dynamic";

export default async function CalendarioV2Page() {
  const desktop = !isMobileUserAgent((await headers()).get("user-agent"));
  return <div className="p-4 md:p-8"><CalendarioWeb formularioDesktop={desktop} /></div>;
}
