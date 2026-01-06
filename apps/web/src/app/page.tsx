import { redirect } from "next/navigation";
// import { getServerSession } from "next-auth";
// import { authOptions } from "../lib/auth";

export default async function Home() {
 // Redirect to login page directly to avoid auth initialization issues
  // The login page will redirect to dashboard if already authenticated 
    redirect("/auth/login");
}
