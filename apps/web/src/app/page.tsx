import { redirect } from "next/navigation";

export default async function Home() {
  // Skip session check on home page to avoid database connection errors
  // Users will be redirected to login if not authenticated on protected routes
  redirect("/auth/login");
}
