import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/auth";

export default async function AuthRedirectPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/signin");
  }

  // Redirect based on user role
  const role = session.user.role;

  switch (role) {
    case "ADMIN":
      redirect("/admin");
    case "GURUJI":
      redirect("/guruji");
    case "COORDINATOR":
      redirect("/coordinator");
    case "USER":
    default:
      redirect("/user");
  }
}
